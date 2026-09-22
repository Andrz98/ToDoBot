import { randomUUID } from 'node:crypto'
import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildConfirmClearMenu } from '../../helpers/taskHelpers/clear/interactiveFlowClear.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'

/**
 * Controlador para manejar /clear y /confirmclear
 *
 * Separar lógica de /clear y /confirmclear para facilitar el mantenimiento (más adelante)
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const clearTask = async (ctx) => {
  try {
    // Autorización de usuario
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    const userId = ctx.from.id
    const count = await Task.countDocuments({ userId, completed: true })

    // 1. caso "sin tareas completadas"
    if (count === 0) {
      return safeReply(ctx, '🤯 No tienes tareas completadas para eliminar.', {
        parse_mode: 'HTML'
      })
    }

    // 2. Debo generar un token y guardar la sesión para proteger las tareas del usuario
    const token = randomUUID()
    ctx.session.flowType = 'clear'
    ctx.session.pendingClearToken = token

    // 3Enviar menú de confirmación (confirmClearMenu)
    const { text, reply_markup } = buildConfirmClearMenu(count, token)
    return safeReply(ctx, text, { parse_mode: 'HTML', reply_markup })
  } catch (error) {
    console.error('😵‍💫 Error en clearTask:', error)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrió un error al iniciar el borrado. Intenta más tarde.'
    )
  }
}
