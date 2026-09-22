import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { startReminderAction } from './startReminderAction.js'
import { saveReminderAction } from './saveReminderAction.js'
import { handleReminderFrequency } from '../../events/reminderEvent/handleReminderFrequency.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface } from '../../utils/telegramUtils/flowMessages.js'
import { OPERATION_CANCELLED_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'

export function registerReminderActions(bot) {
  bot.command('reminder', isAuthorizedUser, startReminderAction)
  bot.action(/^setReminder::/, handleReminderFrequency)
  bot.action(/^saveReminder::/, saveReminderAction)
  bot.action('reminder_cancel', async (ctx) => {
    ctx.session.flowType = null
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })
}
