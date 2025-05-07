import { Markup } from 'telegraf'

/**
 * Menú de selección de campos para completar:
 *    - Nombre (obligatorio)
 *    - Descripción (opcional)
 *    - Fecha  (obligatorio)
 *
 * @param {object} pendingTask – Estado actual de la tarea en construcción
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export function buildAddMenu(pendingTask = {}) {
  const keyboard = []

  if (!pendingTask.name) {
    keyboard.push([
      Markup.button.callback('Nombre (obligatorio)', 'add_field_name')
    ])
  }

  if (!pendingTask.description) {
    keyboard.push([
      Markup.button.callback('Descripción (opcional)', 'add_field_desc')
    ])
  }

  if (!pendingTask.reminderAt) {
    keyboard.push([
      Markup.button.callback('Fecha (obligatorio)', 'add_field_date')
    ])
  }

  // Solo mostramos “Confirmar” cuando name y date ya existen
  if (pendingTask.name && pendingTask.reminderAt) {
    keyboard.push([Markup.button.callback('Confirmar creación', 'add_confirm')])
  }

  const text = 'Selecciona el campo que deseas completar:'
  const inline = Markup.inlineKeyboard(keyboard, { columns: 1 })

  return {
    text,
    markup: { reply_markup: inline.reply_markup }
  }
}
