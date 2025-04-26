import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildCompleteMenu } from '../../helpers/Complete/interactiveFlowComplete.js'

/**
 * Controlador para marcar una tarea como completada /done
 */
export const completeTask = async (ctx) => {
  try {
    // Verificación de autorización
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    // Obtengo todas las tareas activas
    const userId = ctx.from.id
    const tasks = await findAllTasks(userId)
    if (tasks.length === 0) {
      return ctx.reply('No tienes tareas pendientes para completar.', {
        parse_mode: 'HTML'
      })
    }

    // Muestro el botón de selección
    return ctx.reply(
      'Selecciona la tarea que deseas completar:',
      buildCompleteMenu(tasks)
    )
  } catch (error) {
    console.error('😵‍💫 Error en completeTask:', error)
    return ctx.reply(
      '😵‍💫 Algo salió mal al iniciar el flujo de completar tareas. Intenta más tarde.'
    )
  }
}
