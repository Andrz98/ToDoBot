import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildTaskListPage } from '../../helpers/taskHelpers/list/interactiveFlowList.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import {
  deleteNow,
  replyInterface
} from '../../utils/telegramUtils/messageLifecycle.js'
import { replyEmptyState } from '../../helpers/menu/mainMenu.js'

/**
 * /list: muestra el listado de tareas activas. Solo hay un listado vivo por
 * usuario: pedirlo de nuevo sustituye al anterior en vez de acumularlos.
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 */
export const listTasks = async (ctx) => {
  try {
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    const tasks = await findAllTasks(ctx.from.id)

    await deleteNow(ctx, ctx.session.listMessageId)
    delete ctx.session.listMessageId

    if (tasks.length === 0) {
      return replyEmptyState(ctx, '📭 No tienes tareas activas.')
    }

    const { text, reply_markup } = buildTaskListPage(tasks, 0)
    const msg = await replyInterface(ctx, text, { reply_markup })
    ctx.session.listMessageId = msg?.message_id
    return msg
  } catch (error) {
    console.error('😵‍💫 Error en listTasks:', error)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrió un error al mostrar tus tareas. Intenta más tarde.'
    )
  }
}
