import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

/**
 * Primer middleware global: consulta la autorización una vez por update y la
 * deja en `ctx.state.authorized` (la reutilizan isUserAuthorized y la sesión).
 * Un botón pulsado por alguien no autorizado se corta aquí, antes de cualquier
 * handler: ningún callback lee ni escribe datos para él, aunque se le revocara
 * el acceso con una interfaz aún abierta.
 */
export async function resolveAuthorization(ctx, next) {
  try {
    ctx.state.authorized = await isUserAuthorized(ctx)
  } catch (error) {
    // Sin respuesta de Mongo no se decide: los comandos repiten la consulta y
    // responden su propio error; un botón se rechaza (falla cerrado)
    console.error('❌ Error al resolver la autorización:', error)
    if (ctx.callbackQuery) {
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
    return next()
  }

  if (!ctx.state.authorized && ctx.callbackQuery) {
    return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
  }
  return next()
}

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
