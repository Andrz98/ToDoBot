import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildDeleteMenu } from '../../helpers/delete/interactiveFlowDelete.js'

/**
 * Controlador para eliminar una tarea específica /delete
 *
 * Formato obligatorio:
 * /delete NombreExactoDeLaTarea
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const deleteTask = async (ctx) => {
  try {
    // Verificación de autorización
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    // Obtengo todas las tareas activas
    const userId = ctx.from.id
    const tasks = await findAllTasks(userId)
    if (tasks.length === 0) {
      return ctx.reply('No tienes tareas pendientes para eliminar.', {
        parse_mode: 'HTML'
      })
    }

    // Muestro el menú de selección
    return ctx.reply(
      'Selecciona la tarea que deseas eliminar:',
      buildDeleteMenu(tasks)
    )
  } catch (error) {
    console.error('😵‍💫 Error en deleteTask:', error)
    return ctx.reply(
      '😵‍💫 Ocurrió un error al iniciar el flujo de eliminar tareas. Intenta más tarde.'
    )
  }
}
