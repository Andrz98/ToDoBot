import { Appointment } from '../../models/appointment.js'
import { STATUS } from '../../helpers/appointments/status.js'
import {
  agendaRange,
  buildAgendaPage,
  buildAgendaDetail,
  buildCancelConfirm
} from '../../helpers/appointments/appointmentView.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import {
  deleteNow,
  replyInterface
} from '../../utils/telegramUtils/messageLifecycle.js'
import { openAppointmentEditor } from '../appointmentAction/appointmentFlow.js'

const NOT_FOUND_TEXT = 'Cita no encontrada.'
// Una cita cancelada desaparece de la agenda: cualquier botón viejo que la nombre "no existe"
const active = (userId, id) => ({
  _id: id,
  userId,
  status: { $ne: STATUS.CANCELLED }
})

async function agendaPage(userId, range, page, timezone) {
  const { from, to } = agendaRange(range, timezone)
  const appointments = await Appointment.find({
    userId,
    status: { $ne: STATUS.CANCELLED },
    startAt: { $gte: from, $lt: to }
  })
    .sort({ startAt: 1 })
    .lean()
  return buildAgendaPage(appointments, range, page, timezone)
}

// Navegar sustituye el contenido del mismo mensaje; su TTL lo renueva chatCleanup al pulsar
const paint = (ctx, { text, reply_markup }) =>
  ctx
    .editMessageText(text, { parse_mode: 'HTML', reply_markup })
    .catch((error) => debugLog('📆 [agenda] edición omitida:', error?.message))

/**
 * /agenda: citas de hoy, con pestañas para mañana y la semana. Solo hay una
 * agenda viva por usuario: pedirla de nuevo sustituye a la anterior.
 */
export async function showAgenda(ctx) {
  try {
    const timezone = await getUserTimezone(ctx.from.id)
    const { text, reply_markup } = await agendaPage(
      ctx.from.id,
      'today',
      0,
      timezone
    )

    await deleteNow(ctx, ctx.session.agendaMessageId)
    delete ctx.session.agendaMessageId

    const msg = await replyInterface(ctx, text, {
      parse_mode: 'HTML',
      reply_markup
    })
    ctx.session.agendaMessageId = msg?.message_id
    return msg
  } catch (error) {
    console.error('😵‍💫 Error en showAgenda:', error)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrió un error al mostrar tu agenda. Intenta más tarde.'
    )
  }
}

/** Botones de la agenda: solo tocan la cita indicada, nunca el flujo activo. */
const guarded = (handler) => async (ctx) => {
  if (!(await isUserAuthorized(ctx))) {
    return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
  }
  try {
    return await handler(ctx, await getUserTimezone(ctx.from.id))
  } catch (error) {
    console.error('❌ Error en la agenda:', error)
    return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
  }
}

const ID = '([a-f\\d]{24})'
const RANGE = '(today|tomorrow|week)'
const withTarget = (action) =>
  new RegExp(`^agenda_${action}:${ID}:${RANGE}:(\\d+)$`)

export function registerAgendaActions(bot) {
  bot.command('agenda', isAuthorizedUser, showAgenda)

  bot.action('agenda_noop', (ctx) => safeAnswerCbQuery(ctx))

  bot.action(
    new RegExp(`^agenda_r:${RANGE}:(\\d+)$`),
    guarded(async (ctx, timezone) => {
      await safeAnswerCbQuery(ctx)
      const [, range, page] = ctx.match
      return paint(
        ctx,
        await agendaPage(ctx.from.id, range, Number(page), timezone)
      )
    })
  )

  /** Localiza la cita del botón; si ya no existe, avisa y vuelve a la agenda. */
  const withAppointment = (action, handler) =>
    bot.action(
      withTarget(action),
      guarded(async (ctx, timezone) => {
        const [, id, range, page] = ctx.match
        const appointment = await Appointment.findOne(
          active(ctx.from.id, id)
        ).lean()
        if (!appointment) {
          await safeAnswerCbQuery(ctx, NOT_FOUND_TEXT, { show_alert: true })
          return paint(
            ctx,
            await agendaPage(ctx.from.id, range, Number(page), timezone)
          )
        }
        return handler(ctx, {
          appointment,
          range,
          page: Number(page),
          timezone
        })
      })
    )

  withAppointment('d', async (ctx, { appointment, range, page, timezone }) => {
    await safeAnswerCbQuery(ctx)
    return paint(ctx, buildAgendaDetail(appointment, range, page, timezone))
  })

  withAppointment('ok', async (ctx, { appointment, range, page, timezone }) => {
    await Appointment.updateOne(
      { _id: appointment._id },
      { status: STATUS.CONFIRMED, gcalDirty: true }
    )
    await safeAnswerCbQuery(ctx, '✅ Cita confirmada.')
    return paint(
      ctx,
      buildAgendaDetail(
        { ...appointment, status: STATUS.CONFIRMED },
        range,
        page,
        timezone
      )
    )
  })

  withAppointment('no', async (ctx, { appointment, range, page, timezone }) => {
    await safeAnswerCbQuery(ctx)
    return paint(ctx, buildCancelConfirm(appointment, range, page, timezone))
  })

  withAppointment(
    'yes',
    async (ctx, { appointment, range, page, timezone }) => {
      await Appointment.updateOne(
        { _id: appointment._id },
        { status: STATUS.CANCELLED, gcalDirty: true }
      )
      await dismissReminder(ctx, appointment)
      await safeAnswerCbQuery(ctx, '❌ Cita cancelada.')
      return paint(ctx, await agendaPage(ctx.from.id, range, page, timezone))
    }
  )

  bot.action(
    new RegExp(`^agenda_ed:${ID}$`),
    guarded(async (ctx) => {
      const appointment = await Appointment.findOne(
        active(ctx.from.id, ctx.match[1])
      ).lean()
      if (!appointment) {
        return safeAnswerCbQuery(ctx, NOT_FOUND_TEXT, { show_alert: true })
      }
      await safeAnswerCbQuery(ctx)
      // El mensaje de la agenda pasa a ser la interfaz del flujo: no se borra al pedir otra agenda
      delete ctx.session.agendaMessageId
      return openAppointmentEditor(ctx, appointment)
    })
  )
}
