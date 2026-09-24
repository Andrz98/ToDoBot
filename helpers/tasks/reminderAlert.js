import { Markup } from 'telegraf'
import { deleteNow } from '../../utils/telegramUtils/messageLifecycle.js'

const HOUR = 60 * 60 * 1000

/** Aplazar = mover la fecha de la tarea; sus alertas se recalculan desde cero. */
export const SNOOZE = Object.freeze({
  '1h': { label: '⏰ +1 h', ms: HOUR },
  '1d': { label: '📅 +1 día', ms: 24 * HOUR }
})

/** Botones del aviso. Los atiende actions/reminderAction/alertActions.js. */
export const reminderKeyboard = (taskId) =>
  Markup.inlineKeyboard([
    [Markup.button.callback('✅ Hecho', `rem_done::${taskId}`)],
    Object.entries(SNOOZE).map(([key, { label }]) =>
      Markup.button.callback(label, `rem_snooze::${taskId}::${key}`)
    )
  ]).reply_markup

/**
 * Retira del chat el aviso vivo de la tarea (si lo hay) y olvida su id.
 * En un chat privado el chatId es el userId de la tarea.
 */
export async function dismissReminder(ctx, task) {
  if (!task?.reminderMessageId) {
    return
  }
  await deleteNow(ctx, task.reminderMessageId, task.userId)
  task.reminderMessageId = undefined
}
