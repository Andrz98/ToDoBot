import { Appointment, FIELD_LIMITS } from '../../models/appointment.js'
import { STATUS } from '../../helpers/appointments/status.js'
import {
  DEFAULT_DURATION,
  MIN_DURATION,
  MAX_DURATION,
  buildAptMenu,
  buildDurationMenu,
  formatRange,
  isValidDuration
} from '../../helpers/appointments/appointmentView.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  ACTION_FINISHED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerDatePicker } from '../datePickerAction/registerDatePicker.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  askInput,
  closeInterface,
  consumeInput,
  discardFlowMessages,
  expireCallback,
  isLiveInterface,
  openInterface,
  renderInterface
} from '../../utils/telegramUtils/flowMessages.js'

const MINUTE = 60 * 1000
const HAS_TIME = /\d{1,2}:\d{2}/

const PROMPTS = {
  apt_field_client: {
    key: 'apt_client',
    text: '👤 Escribe el nombre del cliente:'
  },
  apt_field_loc: {
    key: 'apt_loc',
    text: '📍 Escribe la ubicación de la cita:'
  },
  apt_field_notes: {
    key: 'apt_notes',
    text: '📝 Escribe las notas de la cita:'
  },
  apt_datetext: {
    key: 'apt_date',
    text: '🕘 Escribe fecha y hora (DD/MM/AAAA HH:mm):'
  },
  apt_dur_custom: {
    key: 'apt_duration',
    text: `⏱️ Escribe la duración en minutos (${MIN_DURATION}–${MAX_DURATION}):`
  }
}

// Respuesta de texto → campo de la cita en construcción
const TEXT_FIELDS = {
  apt_client: 'client',
  apt_loc: 'location',
  apt_notes: 'notes'
}

export const isAptActive = (ctx) =>
  ctx.session?.flowType === 'apt' && Boolean(ctx.session.pendingApt)

function resetAptSession(ctx) {
  delete ctx.session.flowType
  delete ctx.session.awaiting
  delete ctx.session.pendingApt
}

const endOf = (pending, startAt) =>
  new Date(
    startAt.getTime() + (pending.durationMin ?? DEFAULT_DURATION) * MINUTE
  )

/** Otra cita del usuario que se solape con la que se está construyendo. */
function findConflict(userId, pending) {
  if (!pending.startAt) {
    return null
  }
  const startAt = new Date(pending.startAt)
  const filter = {
    userId,
    status: { $ne: STATUS.CANCELLED },
    startAt: { $lt: endOf(pending, startAt) },
    endAt: { $gt: startAt }
  }
  if (pending.id) {
    filter._id = { $ne: pending.id }
  }
  // Un fallo aquí no debe impedir seguir con el flujo: es solo un aviso
  return Appointment.findOne(filter)
    .lean()
    .catch(() => null)
}

/** Pinta el menú de /cita con lo introducido hasta ahora. */
export async function showAptMenu(ctx) {
  ctx.session.awaiting = null
  const timezone = await getUserTimezone(ctx.from.id)
  const conflict = await findConflict(ctx.from.id, ctx.session.pendingApt)
  const { text, markup } = buildAptMenu(
    ctx.session.pendingApt,
    timezone,
    conflict
  )
  return renderInterface(ctx, text, markup)
}

/**
 * /cita: abre el menú del flujo, sustituyendo cualquier interfaz de un flujo
 * anterior que siguiera en pantalla.
 */
export async function startAppointment(ctx) {
  delete ctx.session.editing
  delete ctx.session.edits
  ctx.session.flowType = 'apt'
  ctx.session.pendingApt = {}
  ctx.session.awaiting = null

  const { text, markup } = buildAptMenu()
  await openInterface(ctx, text, markup)
}

/**
 * Edita una cita existente reutilizando el mismo menú: el mensaje pulsado
 * (el detalle de la agenda) pasa a ser la interfaz del flujo.
 */
export async function openAppointmentEditor(ctx, appointment) {
  await discardFlowMessages(ctx)
  delete ctx.session.editing
  delete ctx.session.edits
  ctx.session.flowType = 'apt'
  ctx.session.awaiting = null
  ctx.session.pendingApt = {
    id: String(appointment._id),
    client: appointment.client,
    startAt: appointment.startAt,
    durationMin: Math.round(
      (new Date(appointment.endAt) - new Date(appointment.startAt)) / MINUTE
    ),
    location: appointment.location,
    notes: appointment.notes
  }
  return showAptMenu(ctx)
}

function askField(ctx, action) {
  const { key, text } = PROMPTS[action]
  ctx.session.awaiting = key
  return askInput(ctx, text)
}

/** Aplica la respuesta de texto a la cita en construcción. Devuelve el reintento si no es válida. */
async function applyAnswer(ctx, awaiting, text) {
  const pending = ctx.session.pendingApt

  if (awaiting === 'apt_date') {
    const timezone = await getUserTimezone(ctx.from.id)
    const { date } = detectAndParseDate([text], timezone)
    // "mañana" o "24/09/2026" sin hora dejarían la cita a las 00:00
    if (!date || !HAS_TIME.test(text)) {
      return askInput(
        ctx,
        'Fecha inválida. Usa DD/MM/AAAA HH:mm (la hora es obligatoria).'
      )
    }
    if (date < new Date()) {
      return askInput(ctx, '⌚ La fecha debe ser futura. Escribe otra:')
    }
    pending.startAt = date
  } else if (awaiting === 'apt_duration') {
    const minutes = Number(text)
    if (!isValidDuration(minutes)) {
      return askInput(
        ctx,
        `⏱️ Escribe un número entero de minutos entre ${MIN_DURATION} y ${MAX_DURATION}:`
      )
    }
    pending.durationMin = minutes
  } else {
    const field = TEXT_FIELDS[awaiting]
    if (text.length > FIELD_LIMITS[field]) {
      return askInput(
        ctx,
        `Máximo ${FIELD_LIMITS[field]} caracteres. Escribe otro texto:`
      )
    }
    pending[field] = text
  }

  return showAptMenu(ctx)
}

/** Guarda la cita (nueva o editada). Una cita movida vuelve a "sin confirmar". */
async function saveAppointment(ctx, pending) {
  const startAt = new Date(pending.startAt)
  const editing = Boolean(pending.id)

  const appointment = editing
    ? await Appointment.findOne({
        _id: pending.id,
        userId: ctx.from.id,
        status: { $ne: STATUS.CANCELLED }
      })
    : new Appointment({ userId: ctx.from.id })
  if (!appointment) {
    return { error: 'Cita no encontrada.' }
  }

  const moved = !editing || appointment.startAt.getTime() !== startAt.getTime()
  if (moved && startAt < new Date()) {
    return { error: 'La fecha ya pasó. Elige otra.' }
  }

  appointment.client = pending.client
  appointment.location = pending.location
  appointment.notes = pending.notes
  appointment.startAt = startAt
  appointment.endAt = endOf(pending, startAt)
  appointment.gcalDirty = true
  if (editing && moved) {
    // Con otra hora, el cliente debe reconfirmar y las alertas empiezan de cero
    appointment.status = STATUS.PENDING
    appointment.alertsSent = []
    await dismissReminder(ctx, appointment)
  }
  await appointment.save()
  return { appointment, editing }
}

export function registerAppointmentFlow(bot) {
  bot.command('cita', isAuthorizedUser, startAppointment)

  const guard = (handler) => async (ctx) => {
    if (!isAptActive(ctx) || !isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    await safeAnswerCbQuery(ctx)
    return handler(ctx)
  }

  for (const action of Object.keys(PROMPTS)) {
    if (action !== 'apt_datetext') {
      // apt_datetext lo registra el selector de fecha
      bot.action(
        action,
        guard((ctx) => askField(ctx, action))
      )
    }
  }

  bot.action(
    'apt_dur',
    guard((ctx) => {
      const { text, markup } = buildDurationMenu(
        ctx.session.pendingApt.durationMin
      )
      return renderInterface(ctx, text, markup)
    })
  )

  bot.action(
    /^apt_dur_(\d+)$/,
    guard((ctx) => {
      const minutes = Number(ctx.match[1])
      if (isValidDuration(minutes)) {
        ctx.session.pendingApt.durationMin = minutes
      }
      return showAptMenu(ctx)
    })
  )

  registerDatePicker(bot, 'apt', {
    isActive: isAptActive,
    onPicked: (ctx, date) => {
      ctx.session.pendingApt.startAt = date
      return showAptMenu(ctx)
    },
    onBack: showAptMenu,
    onTextFallback: (ctx) => askField(ctx, 'apt_datetext')
  })

  bot.on('message', async (ctx, next) => {
    const { awaiting } = ctx.session
    // Un comando escrito a mitad de flujo es un comando, no la respuesta al prompt
    if (
      !isAptActive(ctx) ||
      !awaiting?.startsWith('apt_') ||
      !ctx.message?.text ||
      ctx.message.text.startsWith('/')
    ) {
      return typeof next === 'function' ? next() : undefined
    }

    // Pregunta y respuesta siguen visibles unos segundos; el flujo avanza ya
    consumeInput(ctx)
    return applyAnswer(ctx, awaiting, ctx.message.text.trim())
  })

  bot.action('apt_confirm', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }
    const pending = ctx.session.pendingApt
    if (!isAptActive(ctx) || !pending.client || !pending.startAt) {
      return safeAnswerCbQuery(
        ctx,
        'La sesión expiró. Usa /cita para empezar de nuevo.',
        { show_alert: true }
      )
    }
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }

    try {
      const { error, appointment, editing } = await saveAppointment(
        ctx,
        pending
      )
      if (error) {
        return safeAnswerCbQuery(ctx, error, { show_alert: true })
      }

      const timezone = await getUserTimezone(ctx.from.id).catch(() => undefined)
      const done = editing ? '👌🏽 Cita actualizada.' : '✅ Cita creada.'
      await safeAnswerCbQuery(ctx, done)
      resetAptSession(ctx)
      return closeInterface(
        ctx,
        `${done}\n\n👤 ${appointment.client}\n🕘 ${formatRange(appointment.startAt, appointment.endAt, timezone)}`
      )
    } catch (error) {
      console.error('❌ Error en apt_confirm:', error)
      resetAptSession(ctx)
      await closeInterface(ctx, GENERAL_ERROR_TEXT).catch(() => {})
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  bot.action('apt_cancel', async (ctx) => {
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    await safeAnswerCbQuery(ctx, ACTION_FINISHED_TEXT)
    resetAptSession(ctx)
    return closeInterface(ctx, ACTION_FINISHED_TEXT)
  })
}
