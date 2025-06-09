import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { startReminderAction } from './startReminderAction.js'
import { saveReminderAction } from './saveReminderAction.js'
import { handleReminderFrequency } from '../../events/reminderEvent/handleReminderFrequency.js'

export function registerReminderActions(bot) {
  bot.command('reminder', isAuthorizedUser, startReminderAction)
  bot.action(/^setReminder::/, handleReminderFrequency)
  bot.action(/^saveReminder::/, saveReminderAction)
}
