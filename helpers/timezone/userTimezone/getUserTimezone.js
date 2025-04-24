import { AuthorizedUser } from '../../../models/authorizedUser.js'

/**
 * Retorna la zona horaria de un usuario autorizado.
 * Acepta únicamente 'Europe/Madrid' o 'America/Bogota'.
 *
 * @param {number|string} userId - ID del usuario de Telegram
 * @returns {string} - Zona horaria del usuario (o valor por defecto)
 */
export const getUserTimezone = async (userId) => {
  // Traemos sólo el campo timezone
  const user = await AuthorizedUser.findOne(
    { userId: Number(userId) },
    'timezone'
  ).lean()

  if (!user) {
    throw new Error(`User ${userId} not found`)
  }

  const allowedTimezones = ['Europe/Madrid', 'America/Bogota']
  const tz = user.timezone

  return allowedTimezones.includes(tz) ? tz : 'Europe/Madrid'
}
