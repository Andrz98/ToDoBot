import { Markup } from 'telegraf'

/**
 * Construye el texto y el teclado inline para /settimezone
 * @return {{ text: string, markup: { reply_markup: object } }} Para usar en ctx.reply
 */

export const buildTimezoneMenu = (currentTz) => {
  const text = 'Selecciona tu zona horaria:'
  const options = ['Europe/Madrid', 'America/Bogota'].filter(
    (zone) => zone !== currentTz
  )
  const inline = Markup.inlineKeyboard(
    options.map((zone) => [Markup.button.callback(zone, `set_tz_${zone}`)]),
    { columns: 1 }
  )
  return { text, markup: { reply_markup: inline.reply_markup } }
}
