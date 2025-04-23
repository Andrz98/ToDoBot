import { Markup } from 'telegraf'

/**
 * Construye el texto y el teclado inline para /settimezone
 * @return {{ text: string, markup: { reply_markup: object } }} Para usar en ctx.reply
 */

export const buildTimezoneMenu = () => {
  const text = '🌐 Selecciona tu zona horaria:'
  const inline = Markup.inlineKeyboard([
    [Markup.button.callback('Europe/Madrid', 'set_tz_Europe/Madrid')],
    [Markup.button.callback('America/Bogota', 'set_tz_America/Bogota')]
  ])

  return { text, markup: { reply_markup: inline.reply_markup } }
}
