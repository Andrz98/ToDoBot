import { Markup } from 'telegraf'

/**
 * Menú de selección de campos para completar:
 *    - Nombre (obligatorio)
 *    - Descripción (opcional)
 *    - Fecha  (obligatorio)
 *
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export function buildAddMenu() {
  const text = 'Selecciona el campo que deseas completar:'
  const keyboard = [
    [Markup.button.callback('Nombre (obligatorio)', 'add_field_name')],
    [Markup.button.callback('Descripción (opcional)', 'add_field_desc')],
    [Markup.button.callback('Fecha (obligatorio)', 'add_field_date')]
  ]
  const inline = Markup.inlineKeyboard(keyboard, { columns: 1 })

  return {
    text,
    markup: { reply_markup: inline.reply_markup }
  }
}
