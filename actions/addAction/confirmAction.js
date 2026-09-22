import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { safeEditMessageText } from '../../utils/retryUtils/safeEditMessageText.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { safeDeleteMessage } from '../../utils/telegramUtils/safeDeleteMessage.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { Task } from '../../models/task.js'

const DUPLICATE_KEY = 11000
const ADD_DONE_TEXT = '✅ Tarea creada.'

function resetAddSession(ctx) {
  delete ctx.session.flowType
  delete ctx.session.awaiting
  delete ctx.session.pendingTask
  delete ctx.session.menuMessageId
}

/**
 * Cuando el usuario pulsa "Confirmar creación"
 * Guardamos la tarea y salimos del flujo.
 */
export function registerConfirmAction(bot) {
  bot.action('add_confirm', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    const { pendingTask } = ctx.session
    if (!pendingTask?.name || !pendingTask?.reminderAt) {
      return safeAnswerCbQuery(
        ctx,
        'La sesión expiró. Usa /add para empezar de nuevo.',
        { show_alert: true }
      )
    }

    const task = new Task({
      userId: ctx.from.id,
      name: pendingTask.name,
      description: pendingTask.description || '(sin descripción)',
      frequency: 'daily',
      reminderAt: pendingTask.reminderAt
    })

    try {
      await task.save()
    } catch (error) {
      if (error.code === DUPLICATE_KEY) {
        return safeAnswerCbQuery(
          ctx,
          'Ya existe una tarea con ese nombre (puede estar completada: /clear las elimina). Usa /add con otro nombre.',
          { show_alert: true }
        )
      }
      console.error('❌ Error en add_confirm:', error)
      await safeEditMessageReplyMarkup(ctx).catch(() => {})
      resetAddSession(ctx)
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }

    await safeAnswerCbQuery(ctx, ADD_DONE_TEXT)

    if (ctx.callbackQuery?.message) {
      await safeDeleteMessage(
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id
      )
    }

    resetAddSession(ctx)

    flashReply(ctx, ADD_DONE_TEXT)
  })

  bot.action('add_cancel', async (ctx) => {
    const cancelledText = 'Creación cancelada.'
    await safeAnswerCbQuery(ctx, cancelledText)
    await safeEditMessageText(ctx, cancelledText)
    resetAddSession(ctx)
  })
}
