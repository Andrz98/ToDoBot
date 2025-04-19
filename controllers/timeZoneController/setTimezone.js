import { AuthorizedUser } from '../../models/authorizedUser'

/**
 * Comando /settimezone - Establece la zona horaria del usuario
 * Permite al usuario escoger entre'Europe/Madrid' o 'America/Bogota'
 *
 * Ejemplo válido:
 * /settimezone America/Bogota
 */
export const setTimezone = async (ctx) => {
  try {
    const userId = ctx.from.id
    const input = ctx.message.text.replace(/^\/settimezone\s*/, '').trim()

    const allowedTimezones = ['Europe/Madrid', 'America/Bogota']

    if (!allowedTimezones.includes(input)) {
      return ctx.reply(
        '⏰ Zona horaria no válida.\n' +
          'Solo puedes elegir entre:\n' +
          '- Europe/Madrid\n' +
          '- America/Bogota\n\n' +
          'Ejemplo:\n/settimezone America/Bogota'
      )
    }

    const updatedUser = await AuthorizedUser.findOneAndUpdate(
      { telegramId: userId },
      { timezone: input },
      { new: true }
    )

    if (!updatedUser) {
      return ctx.reply('🥸 No estás autorizado para usar este bot.')
    }

    return ctx.reply(`🌐 Tu zona horaria ha sido guardada como: ${input}`)
  } catch (error) {
    console.error('😵‍💫 Error en /settimezone:', error.message)
    return ctx.reply('😵‍💫 Ocurrió un error al guardar tu zona horaria.')
  }
}
