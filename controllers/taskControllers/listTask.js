import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'

/**
 * Controlador para manejar las tareas activas del usuario /list
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 */
export const listTasks = async (ctx) => {
  // 1. Validación de autorización
  if (!(await isUserAuthorized(ctx))) {
    return replyMessages.unauthorized(ctx)
  }

  // 2. Extraigo el ID del usuario y recupero tareas pendientes
  const userId = ctx.from.id
  const tasks = await Task.find({ userId, completed: false }).sort('reminderAt')

  // Aviso al usuario que se mostrará la lista
  await flashReply(ctx, 'Lista de tareas')

  // 2.1 Si no hay tareas, informo al usuario
  if (tasks.length === 0) {
    return safeReply(ctx, 'No tienes tareas activas.', { parse_mode: 'HTML' })
  }

  // 3. Construcción de los botones
  const buttons = tasks.map((t, i) => [
    { text: `${i + 1}. ${t.name}`, callback_data: `show_task_${t._id}` }
  ])

  // 4. Enviar mensaje con inline keyboard usando safeReply
  return safeReply(ctx, 'Selecciona una tarea para ver sus detalles:', {
    reply_markup: { inline_keyboard: buttons }
  })
}
