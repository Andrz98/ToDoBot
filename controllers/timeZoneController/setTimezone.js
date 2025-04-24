import { buildTimezoneMenu } from '../../helpers/timezone/FlowTimezone/interactiveFlowTimezone.js'
import { AuthorizedUser } from '../../models/authorizedUser.js'

/**
 * Comando /settimezone - Establece la zona horaria del usuario
 * Permite al usuario escoger entre 'Europe/Madrid' o 'America/Bogota'
 *
 * Ejemplo válido:
 * /settimezone America/Bogota
 */
export const setTimezone = async (ctx) => {
  try {
    const userId = ctx.from.id
    const input = ctx.message.text.replace(/^\/settimezone\s*/, '').trim()

    const allowedTimezones = ['Europe/Madrid', 'America/Bogota']

    // Sino proporciona argumentos, mostramos el menu de opciones
    if (!input) {
      const { text, markup } = buildTimezoneMenu()
      return ctx.reply(text, { parse_mode: 'HTML', ...markup })
    }

    // Valido la zona horaria
    if (!allowedTimezones.includes(input)) {
      return ctx.reply(
        '🌐 Zona horaria no válida. Solo puedes elegir entre:\n' +
          '- <b>Europe/Madrid</b>\n' +
          '- <b>America/Bogota</b>\n\n',
        { parse_mode: 'HTML' }
      )
    }

    const updatedUser = await AuthorizedUser.findOneAndUpdate(
      { userId },
      { timezone: input },
      { new: true }
    )

    if (!updatedUser) {
      return ctx.reply('🥸 No estás autorizado para usar este bot.')
    }

    return ctx.reply(
      `🌐 Tu zona horaria ha sido guardada como: <b>${input}</b>`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error en /settimezone:', error.message)
    return ctx.reply('😵‍💫 Ocurrió un error al guardar tu zona horaria.')
  }
}
