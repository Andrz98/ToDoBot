import { Markup } from 'telegraf'
import { frequencyLabels } from '../frequencyLabels.js'

export const isValidFrequency = (value) =>
  Object.hasOwn(frequencyLabels, value)

/**
 * Botonera de periodicidad. Marca la opción actual.
 * @param {(value: string) => string} callbackFor – callback_data de cada opción
 * @param {string} [current] – periodicidad actual
 * @param {Array<Array<object>>} [extraRows] – filas finales (volver, cancelar…)
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export const buildFrequencyMenu = (callbackFor, current, extraRows = []) => {
  const text = '🔁 ¿Con qué periodicidad quieres esta tarea?'
  const rows = Object.entries(frequencyLabels).map(([value, label]) => [
    Markup.button.callback(
      value === current ? `✅ ${label}` : label,
      callbackFor(value)
    )
  ])
  return {
    text,
    markup: {
      reply_markup: Markup.inlineKeyboard([...rows, ...extraRows]).reply_markup
    }
  }
}
