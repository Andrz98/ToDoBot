import { Markup } from 'telegraf'
import { frequencyLabels } from '../frequencyLabels.js'

/**
 * Construye texto y teclado inline para la clasificación de periodicidad.
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export const buildFrequencyMenu = () => {
  const text = '¿Con qué periodicidad quieres esta tarea?'
  const options = Object.entries(frequencyLabels).map(([value, label]) => ({
    label,
    value
  }))
  const inline = Markup.inlineKeyboard(
    options.map((o) => [
      Markup.button.callback(o.label, `add_freq_${o.value}`)
    ]),
    { columns: 1 }
  )
  return { text, markup: { reply_markup: inline.reply_markup } }
}
