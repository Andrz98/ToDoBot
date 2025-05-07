import { Markup } from 'telegraf'

/**
 * Botón inicial de /add:
 *    Pregunta al usuario si quiere crear una nueva tarea.
 *
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export function buildAddButton() {
  const text = '¿Quieres agregar una nueva tarea?'
  const inline = Markup.inlineKeyboard(
    [[Markup.button.callback('Crear tarea', 'add_create')]],
    { columns: 1 }
  )

  return {
    text,
    markup: { reply_markup: inline.reply_markup }
  }
}
