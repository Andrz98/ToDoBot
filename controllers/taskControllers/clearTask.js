import { randomUUID } from 'node:crypto'
import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  replyMessages,
  CLEAR_DONE_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildConfirmClearMenu } from '../../helpers/taskHelpers/clear/interactiveFlowClear.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { replyTemporary } from '../../utils/telegramUtils/messageLifecycle.js'
import {
  openInterface,
  discardFlowMessages
} from '../../utils/telegramUtils/flowMessages.js'

/**
 * Controlador para manejar /clear y /confirmclear
 *
 * /clear: cuenta las tareas completadas y pide confirmación con botones.
 * /confirmclear: si ya hay una confirmación de /clear pendiente y válida,
 * ejecuta el borrado directamente (atajo sin botones). Si no hay ninguna
 * pendiente, se comporta igual que /clear.
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const clearTask = async (ctx) => {
  try {
    // Autorización de usuario
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    const userId = ctx.from.id
    const isConfirmShortcut = (ctx.message?.text ?? '')
      .trim()
      .toLowerCase()
      .startsWith('/confirmclear')

    if (
      isConfirmShortcut &&
      ctx.session.flowType === 'clear' &&
      ctx.session.pendingClearToken
    ) {
      await Task.deleteMany({ userId, completed: true })
      ctx.session.flowType = null
      ctx.session.pendingClearToken = null
      await discardFlowMessages(ctx)
      return replyTemporary(ctx, CLEAR_DONE_TEXT)
    }

    const count = await Task.countDocuments({ userId, completed: true })

    // 1. caso "sin tareas completadas"
    if (count === 0) {
      return replyTemporary(ctx, '📭 No tienes tareas completadas para eliminar.')
    }

    // 2. Debo generar un token y guardar la sesión para proteger las tareas del usuario
    const token = randomUUID()
    ctx.session.flowType = 'clear'
    ctx.session.pendingClearToken = token

    // 3Enviar menú de confirmación (confirmClearMenu)
    const { text, reply_markup } = buildConfirmClearMenu(count, token)
    return openInterface(ctx, text, { parse_mode: 'HTML', reply_markup })
  } catch (error) {
    console.error('😵‍💫 Error en clearTask:', error)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrió un error al iniciar el borrado. Intenta más tarde.'
    )
  }
}
