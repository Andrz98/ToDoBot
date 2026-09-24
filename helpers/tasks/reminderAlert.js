import { Markup } from 'telegraf'
import { deleteNow } from '../../utils/telegramUtils/messageLifecycle.js'
import { STATUS } from '../appointments/status.js'

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
 * Botón del aviso de una cita: solo se ofrece confirmar mientras esté sin
 * confirmar. Cancelar o editar exigen pasar por /agenda, con su confirmación.
 * @returns el teclado, o undefined si la cita ya está confirmada
 */
export const appointmentKeyboard = (appointment) =>
  appointment.status === STATUS.PENDING
    ? Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Confirmar',
            `rem_aptok::${appointment._id}`
          )
        ]
      ]).reply_markup
    : undefined

/**
 * Retira del chat el aviso vivo de la tarea o cita (si lo hay) y olvida su id.
 * En un chat privado el chatId es el userId del dueño.
 */
export async function dismissReminder(ctx, task) {
  if (!task?.reminderMessageId) {
    return
  }
  await deleteNow(ctx, task.reminderMessageId, task.userId)
  task.reminderMessageId = undefined
}
