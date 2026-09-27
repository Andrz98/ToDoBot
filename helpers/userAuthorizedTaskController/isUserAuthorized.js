import { AuthorizedUser } from '../../models/authorizedUser.js'

/**
 * Verifica si el usuario que envía el mensaje está autorizado para usar mi bot
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 * @returns {Promise<Boolean>} - true si está autorizado, false si no
 */
export const isUserAuthorized = async (ctx) => {
  // resolveAuthorization ya lo consultó en este mismo update
  if (typeof ctx.state?.authorized === 'boolean') {
    return ctx.state.authorized
  }
  const userId = ctx.from?.id
  if (!userId) {
    return false
  }

  const exists = await AuthorizedUser.exists({ userId })
  return Boolean(exists)
}
