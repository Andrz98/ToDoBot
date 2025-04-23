import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'

/**
 * Controlador para manejar las tareas activas del usuario /list
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 */
export const listTasks = async (ctx) => {
  // Validación de autorización
  if (!(await isUserAuthorized(ctx))) {
    return replyMessages.unauthorizedUser(ctx)
  }

  // Extraigo el ID del usuario que envió el comando
  const userId = ctx.from.id
  const task = await Task.find({ userId, completed: false }).sort('reminderAt')
  if (!task.length === 0) {
    return ctx.reply('No tienes tareas activas.', { parse_mode: 'HTML' })
  }

  // Construcción de los botones
  const buttons = task.map((task, i) =>
    // callback_data: show_task_<id>
    [{ text: `${i + 1}. ${task.name}`, callback_data: `show_task_${task._id}` }]
  )

  // 4) Enviar mensaje con inline keyboard
  return ctx.reply('Selecciona una tarea para ver sus detalles:', {
    reply_markup: {
      inline_keyboard: buttons
    }
  })
}
