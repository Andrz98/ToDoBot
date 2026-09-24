import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  closeInterface,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { isEditActive, loadEditedTask, resetEditSession } from './editMenu.js'

const DUPLICATE_KEY = 11000
const EDIT_CANCELLED_TEXT = 'Edición cancelada.'

export function registerSaveEditAction(bot) {
  bot.action('edit_save', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }
    if (!isEditActive(ctx) || !isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }

    const { editing } = ctx.session

    try {
      const timezone =
        ctx.session.timezone ?? (await getUserTimezone(ctx.from.id))
      const { task, updated } = await loadEditedTask(ctx, timezone)
      if (!task) {
        resetEditSession(ctx)
        await safeAnswerCbQuery(ctx)
        return closeInterface(
          ctx,
          `🤯 No se encontró ninguna tarea llamada "${escapeHtml(editing.oldName)}"`,
          { parse_mode: 'HTML' }
        )
      }

      if (updated) {
        // El aviso vivo habla de la fecha anterior
        if (ctx.session.edits?.date) {
          await dismissReminder(ctx, task)
        }
        await task.save()
      }
      const cbText = updated ? '👌🏽 Tarea editada' : 'ℹ️ No hubo cambios.'

      await safeAnswerCbQuery(ctx, cbText)
      resetEditSession(ctx)
      return closeInterface(ctx, `${cbText}\n\n🔺 ${escapeHtml(task.name)}`, {
        parse_mode: 'HTML'
      })
    } catch (error) {
      if (error.code === DUPLICATE_KEY) {
        return safeAnswerCbQuery(
          ctx,
          'Ya existe una tarea con ese nombre. Elige otro nombre.',
          { show_alert: true }
        )
      }
      if (error.message === 'PAST_DATE') {
        return safeAnswerCbQuery(
          ctx,
          'La nueva fecha ya pasó. Elige otra antes de guardar.',
          { show_alert: true }
        )
      }
      console.error('❌ Error en edit_save:', error)
      resetEditSession(ctx)
      await closeInterface(ctx, GENERAL_ERROR_TEXT).catch(() => {})
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  bot.action('edit_cancel', async (ctx) => {
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    await safeAnswerCbQuery(ctx, EDIT_CANCELLED_TEXT)
    resetEditSession(ctx)
    return closeInterface(ctx, EDIT_CANCELLED_TEXT)
  })
}
