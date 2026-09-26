import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import {
  DELETE_PROMPT,
  buildDeleteMenu
} from '../../helpers/taskHelpers/delete/interactiveFlowDelete.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { replyEmptyState } from '../../helpers/menu/mainMenu.js'
import { openInterface } from '../../utils/telegramUtils/flowMessages.js'

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
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    const userId = ctx.from.id
    const tasks = await findAllTasks(userId)
    if (tasks.length === 0) {
      return replyEmptyState(ctx, '📭 No tienes tareas pendientes para eliminar.')
    }

    // Autocuramos flowType obsoleto de otro flujo abandonado
    ctx.session.flowType = 'delete'

    return openInterface(ctx, DELETE_PROMPT, buildDeleteMenu(tasks))
  } catch (error) {
    console.error('😵‍💫 Error en deleteTask:', error)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrió un error al iniciar el flujo de eliminar tareas. Intenta más tarde.'
    )
  }
}
