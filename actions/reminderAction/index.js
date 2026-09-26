import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { startReminderAction } from './startReminderAction.js'
import { saveReminderAction } from './saveReminderAction.js'
import { registerAlertActions } from './alertActions.js'
import { handleReminderFrequency } from '../../events/reminderEvent/handleReminderFrequency.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface } from '../../utils/telegramUtils/flowMessages.js'
import { ACTION_FINISHED_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'

export function registerReminderActions(bot) {
  bot.command('reminder', isAuthorizedUser, startReminderAction)
  bot.action(/^setReminder::/, handleReminderFrequency)
  bot.action(/^saveReminder::/, saveReminderAction)
  registerAlertActions(bot)
  bot.action('reminder_cancel', async (ctx) => {
    ctx.session.flowType = null
    await safeAnswerCbQuery(ctx, ACTION_FINISHED_TEXT)
    return closeInterface(ctx, ACTION_FINISHED_TEXT)
  })
}
