import { Markup } from 'telegraf'

/**
 * Construye texto y teclado inline para la clasificación de periodicidad.
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export const buildFrequencyMenu = () => {
  const text = '¿Con qué periodicidad quieres esta tarea?'
  const options = [
    { label: 'Diario', value: 'daily' },
    { label: 'Semanal', value: 'weekly' },
    { label: 'Mensual', value: 'monthly' },
    { label: 'Anual', value: 'yearly' }
  ]
  const inline = Markup.inlineKeyboard(
    options.map((o) => [
      Markup.button.callback(o.label, `add_freq_${o.value}`)
    ]),
    { columns: 1 }
  )
  return { text, markup: { reply_markup: inline.reply_markup } }
}
