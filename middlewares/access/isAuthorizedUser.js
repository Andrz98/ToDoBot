import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { UNAUTHORIZED_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'

export async function isAuthorizedUser(ctx, next) {
  let authorized
  try {
    authorized = await isUserAuthorized(ctx)
  } catch (error) {
    console.error('❌ Error al verificar autorización:', error)
    return ctx.reply('😵‍💫 Error interno de autorización.')
  }

  if (!authorized) {
    return ctx.reply(UNAUTHORIZED_TEXT)
  }
  return next()
}
