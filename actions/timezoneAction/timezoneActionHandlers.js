import { AuthorizedUser } from '../../models/authorizedUser.js'

/**
 * Registra los callbacks para los botones de /settimezone
 * @param {import('telegraf').Telegraf} bot
 */
export function registerTimezoneActions(bot) {
  // Uso la expresión regular para capturar la zona tras "set_tz_"
  bot.action(/^set_tz_(.+)$/, async (ctx) => {
    try {
      const tz = ctx.match[1] // "Europe/Madrid" o "America/Bogota"
      const userId = ctx.from.id

      // Actualizo en la base de datos
      const updatedUser = await AuthorizedUser.findOneUpdate(
        { userId },
        { timezone: tz },
        { new: true }
      )

      // Responde all callback (quita el "cargando..." del botón)
      await ctx.answerCbQuery()

      if (!updatedUser) {
        return '🥸 No estás autorizado para usar este bot.'
      }

      return ctx.reply(
        `🌐 Tu zona horaria ha sido guardada como: <b>${tz}</b>`,
        { parse_mode: 'HTML' }
      )
    } catch (err) {
      console.error('😵‍💫 Error en timezoneActionHandlers:', err)
      return ctx.reply(
        '😵‍💫 Ocurrió un error al procesar tu selección de zona.',
        { parse_mode: 'HTML' }
      )
    }
  })
}
