import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { buildAddButton } from '../../helpers/taskHelpers/add/addCommand.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'

/**
 * Controlador para /add que lanza el botón inicial de creación.
 * @param {import('telegraf').Context} ctx
 */
export const addTask = async (ctx) => {
  // 1) Autorización
  if (!(await isUserAuthorized(ctx))) {
    return replyMessages.unauthorized(ctx)
  }

  // 2) Mostramos el botón inicial para crear tarea
  const { text, markup } = buildAddButton()
  return ctx.reply(text, markup)
}
