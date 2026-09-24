import { CalendarLink } from '../../models/calendarLink.js'
import {
  GoogleApiError,
  createCalendar,
  deleteCalendar,
  isCalendarEnabled,
  shareCalendar
} from '../../services/google/calendarClient.js'
import {
  buildCalConfirm,
  buildCalIntro,
  buildCalStatus,
  buildDisconnectConfirm,
  isValidEmail
} from '../../helpers/calendar/calendarView.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  OPERATION_CANCELLED_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import {
  TTL,
  deleteNow,
  replyInterface,
  replyTemporary,
  scheduleDeletion
} from '../../utils/telegramUtils/messageLifecycle.js'
import {
  askInput,
  closeInterface,
  consumeInput,
  expireCallback,
  isLiveInterface,
  openInterface,
  renderInterface
} from '../../utils/telegramUtils/flowMessages.js'

const DUPLICATE_KEY = 11000
const CALENDAR_DESCRIPTION =
  'Gestionado por TuttoFatto: es una copia de solo lectura de tus citas. ' +
  'Los cambios se hacen desde el bot.'

const isCalActive = (ctx) =>
  ctx.session?.flowType === 'cal' && Boolean(ctx.session.pendingCal)

function resetCalSession(ctx) {
  delete ctx.session.flowType
  delete ctx.session.awaiting
  delete ctx.session.pendingCal
}

const tappedId = (ctx) => ctx.callbackQuery?.message?.message_id

// Navegar sustituye el contenido del mismo mensaje; su TTL lo renueva chatCleanup al pulsar
const paint = (ctx, { text, reply_markup }) =>
  ctx
    .editMessageText(text, { parse_mode: 'HTML', reply_markup })
    .catch((error) =>
      debugLog('🗓️ [calendar] edición omitida:', error?.message)
    )

/** Abre el flujo de conexión: pide el correo de la cuenta de Google. */
async function startConnect(ctx) {
  delete ctx.session.editing
  delete ctx.session.edits
  ctx.session.flowType = 'cal'
  ctx.session.pendingCal = {}
  ctx.session.awaiting = 'cal_email'

  const { text, markup } = buildCalIntro()
  await openInterface(ctx, text, markup)
  return askInput(ctx, '📧 Escribe tu correo de Google:')
}

/**
 * /calendar: sin conectar, inicia la conexión; conectado, muestra el estado.
 * Solo hay una pantalla de estado viva por usuario.
 */
export async function showCalendar(ctx) {
  if (!isCalendarEnabled()) {
    return replyTemporary(
      ctx,
      '🗓️ Google Calendar no está configurado en este bot.'
    )
  }

  try {
    const link = await CalendarLink.findOne({ userId: ctx.from.id }).lean()

    await deleteNow(ctx, ctx.session.calendarMessageId)
    delete ctx.session.calendarMessageId

    if (!link) {
      return await startConnect(ctx)
    }
    const { text, reply_markup } = buildCalStatus(link)
    const msg = await replyInterface(ctx, text, {
      parse_mode: 'HTML',
      reply_markup
    })
    ctx.session.calendarMessageId = msg?.message_id
    return msg
  } catch (error) {
    console.error('😵‍💫 Error en showCalendar:', error)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrió un error al abrir Google Calendar. Intenta más tarde.'
    )
  }
}

function failureBanner(error) {
  if (error.code === DUPLICATE_KEY) {
    return '⚠️ Ya tienes Google Calendar conectado. Usa /calendar para verlo.'
  }
  if (error instanceof GoogleApiError && error.status === 400) {
    return '⚠️ Google no acepta ese correo. Compruébalo o cámbialo.'
  }
  return '⚠️ No pude conectar con Google. Inténtalo de nuevo en un momento.'
}

/** Crea el calendario, lo comparte y guarda el vínculo. Si algo falla, no deja calendarios huérfanos. */
async function connect(ctx) {
  const { email } = ctx.session.pendingCal
  await safeAnswerCbQuery(ctx)
  // Google tarda unos segundos (crear el calendario ronda los 7 s): sin botones no hay doble pulsación
  await paint(ctx, {
    text: '⏳ Conectando con Google…',
    reply_markup: { inline_keyboard: [] }
  })

  const timezone = await getUserTimezone(ctx.from.id)
  const name = ctx.from.first_name || ctx.from.username || String(ctx.from.id)
  let calendarId
  try {
    calendarId = await createCalendar({
      summary: `TuttoFatto — ${name}`.slice(0, 100),
      timeZone: timezone,
      description: CALENDAR_DESCRIPTION
    })
    await shareCalendar(calendarId, email)
    await CalendarLink.create({ userId: ctx.from.id, email, calendarId })
  } catch (error) {
    console.error('❌ Error al conectar Google Calendar:', error)
    if (calendarId) {
      await deleteCalendar(calendarId).catch((cleanupError) =>
        console.error(
          `❌ Calendario huérfano ${calendarId}:`,
          cleanupError.message
        )
      )
    }
    const { text, markup } = buildCalConfirm(email, failureBanner(error))
    return renderInterface(ctx, text, markup)
  }

  // El mensaje del flujo pasa a ser la pantalla de estado, ya sin flujo activo
  resetCalSession(ctx)
  delete ctx.session.menuMessageId
  ctx.session.calendarMessageId = tappedId(ctx)
  return paint(ctx, buildCalStatus({ email, calendarId }))
}

/** Botones de la pantalla de estado: exigen autorización y no tocan el flujo activo. */
const guarded = (handler) => async (ctx) => {
  if (!(await isUserAuthorized(ctx))) {
    return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
  }
  try {
    return await handler(ctx)
  } catch (error) {
    console.error('❌ Error en /calendar:', error)
    return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
  }
}

export function registerCalendarActions(bot) {
  bot.command('calendar', isAuthorizedUser, showCalendar)

  bot.on('message', async (ctx, next) => {
    // Un comando escrito a mitad de flujo es un comando, no la respuesta al prompt
    if (
      !isCalActive(ctx) ||
      ctx.session.awaiting !== 'cal_email' ||
      !ctx.message?.text ||
      ctx.message.text.startsWith('/')
    ) {
      return typeof next === 'function' ? next() : undefined
    }

    consumeInput(ctx)
    const email = ctx.message.text.trim().toLowerCase()
    if (!isValidEmail(email)) {
      return askInput(
        ctx,
        'Ese correo no parece válido. Escríbelo de nuevo (ej.: nombre@gmail.com):'
      )
    }

    ctx.session.pendingCal.email = email
    ctx.session.awaiting = null
    const { text, markup } = buildCalConfirm(email)
    return renderInterface(ctx, text, markup)
  })

  bot.action('cal_change', async (ctx) => {
    if (!isCalActive(ctx) || !isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'cal_email'
    return askInput(ctx, '📧 Escribe el nuevo correo:')
  })

  bot.action('cal_confirm', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }
    if (!isCalActive(ctx) || !ctx.session.pendingCal.email) {
      return safeAnswerCbQuery(
        ctx,
        'La sesión expiró. Usa /calendar para empezar de nuevo.',
        { show_alert: true }
      )
    }
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    try {
      return await connect(ctx)
    } catch (error) {
      console.error('❌ Error en cal_confirm:', error)
      resetCalSession(ctx)
      return closeInterface(ctx, GENERAL_ERROR_TEXT).catch(() => {})
    }
  })

  bot.action('cal_cancel', async (ctx) => {
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    resetCalSession(ctx)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })

  bot.action(
    'cal_disconnect',
    guarded(async (ctx) => {
      const link = await CalendarLink.findOne({ userId: ctx.from.id }).lean()
      if (!link) {
        return safeAnswerCbQuery(ctx, 'Google Calendar no está conectado.', {
          show_alert: true
        })
      }
      await safeAnswerCbQuery(ctx)
      return paint(ctx, buildDisconnectConfirm(link))
    })
  )

  bot.action(
    'cal_back',
    guarded(async (ctx) => {
      const link = await CalendarLink.findOne({ userId: ctx.from.id }).lean()
      if (!link) {
        return safeAnswerCbQuery(ctx, 'Google Calendar no está conectado.', {
          show_alert: true
        })
      }
      await safeAnswerCbQuery(ctx)
      return paint(ctx, buildCalStatus(link))
    })
  )

  bot.action(
    'cal_disconnect_yes',
    guarded(async (ctx) => {
      const link = await CalendarLink.findOne({ userId: ctx.from.id }).lean()
      if (link) {
        // Si Google falla no se toca el vínculo: así se puede reintentar
        await deleteCalendar(link.calendarId)
        await CalendarLink.deleteOne({ _id: link._id })
      }
      await safeAnswerCbQuery(ctx, '🔌 Google Calendar desconectado.')
      await paint(ctx, {
        text: '🔌 Google Calendar desconectado.',
        reply_markup: { inline_keyboard: [] }
      })
      // Ya no hay nada que hacer con este mensaje: se limpia como cualquier aviso
      delete ctx.session.calendarMessageId
      return scheduleDeletion(ctx, tappedId(ctx), TTL.NOTICE)
    })
  )
}
