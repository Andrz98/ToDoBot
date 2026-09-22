import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { safeDeleteMessage } from '../../utils/telegramUtils/safeDeleteMessage.js'
import { updateTaskFields } from '../../helpers/taskHelpers/edit/updateTaskFields.js'
import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  replyMessages,
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

const DUPLICATE_KEY = 11000

function resetEditSession(ctx) {
  delete ctx.session.flowType
  delete ctx.session.editing
  delete ctx.session.edits
  delete ctx.session.awaiting
  delete ctx.session.menuMessageId
  delete ctx.session.timezone
}

export function registerSaveEditAction(bot) {
  bot.action('edit_save', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    await safeEditMessageReplyMarkup(ctx).catch(() => {})

    const { editing, edits } = ctx.session

    try {
      const task = await Task.findById(editing.id)
      if (!task) {
        resetEditSession(ctx)
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const { updated } = updateTaskFields(task, edits, ctx.session.timezone)
      let cbText
      if (updated) {
        await task.save()
        cbText = '👌🏽 Tarea editada'
      } else {
        cbText = 'ℹ️ No hubo cambios.'
      }

      await safeAnswerCbQuery(ctx, cbText)

      if (ctx.callbackQuery?.message) {
        await safeDeleteMessage(
          ctx,
          ctx.chat.id,
          ctx.callbackQuery.message.message_id
        )
      }

      resetEditSession(ctx)
      flashReply(ctx, cbText)
    } catch (error) {
      if (error.code === DUPLICATE_KEY) {
        return safeAnswerCbQuery(
          ctx,
          'Ya existe una tarea con ese nombre. Elige otro nombre.',
          { show_alert: true }
        )
      }
      console.error('❌ Error en edit_save:', error)
      resetEditSession(ctx)
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })
}
