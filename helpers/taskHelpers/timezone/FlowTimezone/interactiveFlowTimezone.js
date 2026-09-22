import { Markup } from 'telegraf'
import { ALLOWED_TIMEZONES } from '../allowedTimezones.js'

/**
 * Construye el texto y el teclado inline para /settimezone
 * @return {{ text: string, markup: { reply_markup: object } }} Para usar en ctx.reply
 */

export const buildTimezoneMenu = (currentTz) => {
  const text = 'Selecciona tu zona horaria:'
  const options = ALLOWED_TIMEZONES.filter((zone) => zone !== currentTz)
  const inline = Markup.inlineKeyboard(
    [
      ...options.map((zone) => [Markup.button.callback(zone, `set_tz_${zone}`)]),
      [Markup.button.callback('✖️ Cancelar', 'confirm_tz_no')]
    ],
    { columns: 1 }
  )
  return { text, markup: { reply_markup: inline.reply_markup } }
}
