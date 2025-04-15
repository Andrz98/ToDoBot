import { AuthorizedUser } from '../../models/authorizedUser.js'

/**
 * Verifica si el usuario que envía el mensaje está autorizado para usar mi bot
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 * @returns {Promise<Boolean>} - true si está autorizado, false si no
 */
export const isUserAuthorized = async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) {
    return false
  }

  const exists = await AuthorizedUser.exists({ telegramId: userId })
  return Boolean(exists)
}
