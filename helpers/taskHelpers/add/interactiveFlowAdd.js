import { Markup } from 'telegraf'
import { formatDateEs } from '../../../helpers/taskHelpers/date/formatDateEs.js'

/**
 * Menú de selección de campos para completar:
 *    - Nombre (obligatorio)
 *    - Descripción (opcional)
 *    - Fecha  (obligatorio)
 *
 * @param {object} pendingTask – Estado actual de la tarea en construcción
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export function buildAddMenu(pendingTask = {}, timezone = 'Europe/Madrid') {
  const keyboard = []

  // ── Resumen de campos ya completados ──
  const summaryLines = []
  if (pendingTask.name) {
    summaryLines.push(`🔺 Nombre: ${pendingTask.name}`)
  }
  if (pendingTask.description) {
    summaryLines.push(`🔸 Descripción: ${pendingTask.description}`)
  }
  if (pendingTask.reminderAt) {
    // formateamos la fecha para mostrarla al usuario
    summaryLines.push(
      `🔹 Fecha: ${formatDateEs(pendingTask.reminderAt, timezone || 'Europe/Madrid')}`
    )
  }
  // Si hay resumen, lo unimos y añadimos dos saltos de línea
  const summary = summaryLines.length ? summaryLines.join('\n') + '\n\n' : ''
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

  const text = summary + 'Selecciona el campo que deseas completar:'
  const inline = Markup.inlineKeyboard(keyboard, { columns: 1 })

  return {
    text,
    markup: { reply_markup: inline.reply_markup }
  }
}
