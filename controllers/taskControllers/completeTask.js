import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildCompleteMenu } from '../../helpers/taskHelpers/Complete/interactiveFlowComplete.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { replyEmptyState } from '../../helpers/menu/mainMenu.js'
import { openInterface } from '../../utils/telegramUtils/flowMessages.js'

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
      return replyEmptyState(ctx, '📭 No tienes tareas pendientes para completar.')
    }

    // Autocuramos flowType obsoleto de otro flujo abandonado
    ctx.session.flowType = 'complete'

    // Muestro el botón de selección
    return openInterface(
      ctx,
      'Selecciona la tarea que deseas completar:',
      buildCompleteMenu(tasks)
    )
  } catch (error) {
    console.error('😵‍💫 Error en completeTask:', error)
    return safeReply(
      ctx,
      '😵‍💫 Algo salió mal al iniciar el flujo de completar tareas. Intenta más tarde.'
    )
  }
}
