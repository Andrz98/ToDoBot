import { DateTime } from 'luxon'
import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { GENERAL_ERROR_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'
import {
  applyEdit,
  resetEditSession
} from '../../actions/editAction/editMenu.js'
import {
  askInput,
  consumeInput,
  closeInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'

const INVALID_DATE_PROMPT =
  '🤯 El formato de fecha no es válido. Usa DD/MM/AAAA HH:mm, o solo HH:mm para cambiar la hora.'
const PAST_DATE_PROMPT = '⌚ La nueva fecha debe ser futura. Escribe otra:'

/** Solo HH:mm: conserva el día de la tarea y cambia la hora. */
const parseEditDate = (text, task, timezone) => {
  const { date } = detectAndParseDate([text], timezone)
  if (date) {
    return date
  }
  if (!/^\d{1,2}:\d{2}$/.test(text)) {
    return null
  }
  const [hour, minute] = text.split(':').map(Number)
  const dt = DateTime.fromJSDate(new Date(task.reminderAt), {
    zone: timezone
  }).set({ hour, minute })
  return dt.isValid ? dt.toJSDate() : null
}

const fieldsFor = (awaiting, text) => (task, timezone) => {
  switch (awaiting) {
    case 'new_name':
      return { newName: text }
    case 'new_desc':
      return { newDescription: text }
    case 'new_date': {
      const date = parseEditDate(text, task, timezone)
      return date ? { date } : null
    }
    default:
      return null
  }
}

/**
 * Respuestas de texto del flujo /edit. El cambio se refleja editando el menú;
 * la pregunta y la respuesta se limpian unos segundos después.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerForceReplyHandler(bot) {
  bot.on('message', async (ctx, next) => {
    debugLog('📥 [editForceReplyHandler] Recibido mensaje')

    if (ctx.message?.text?.startsWith('/')) {
      return typeof next === 'function' ? next() : undefined
    }
    if (!ctx.session?.awaiting || !ctx.session.editing) {
      return typeof next === 'function' ? next() : undefined
    }

    const { awaiting } = ctx.session
    const text = ctx.message.text.trim()
    consumeInput(ctx)

    try {
      const valid = await applyEdit(ctx, fieldsFor(awaiting, text))
      if (!valid) {
        return askInput(ctx, INVALID_DATE_PROMPT)
      }
    } catch (error) {
      if (error.message === 'PAST_DATE') {
        return askInput(ctx, PAST_DATE_PROMPT)
      }
      console.error('❌ Error en forceReplyHandler:', error)
      resetEditSession(ctx)
      return closeInterface(ctx, GENERAL_ERROR_TEXT)
    }
  })
}
