import { AuthorizedUser } from '../../models/authorizedUser.js'

/**
 * Retorna la zona horaria del usuario
 * Solo se aceptan: 'Europe/Madrid' o 'America/Bogotá'
 *
 * @param {number} userId - ID del usuario de Telegram
 * @returns {string} - Zona horaria del usuario
 */
export const getUserTimezone = async (userId) => {
  const user = await AuthorizedUser.findOne({ telegramId: userId })

  // Zonas horarias aceptadas
  const allowedTimezones = ['Europe/Madrid', 'America/Bogota']
  const tz = user?.timezone

  if (allowedTimezones.includes(tz)) {
    return tz
  }

  return 'Europe/Madrid' // Zona horaria por defecto
}
