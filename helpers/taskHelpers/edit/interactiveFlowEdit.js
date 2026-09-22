import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'
import { escapeHtml } from '../../../utils/textUtils/escapeHtml.js'
import { frequencyLabels } from '../../frequency/frequencyLabels.js'

/**
 * Construye el texto y el teclado inline para el flujo interactivo de /edit.
 * @param {object}  task      – Instancia de Task de Mongoose
 * @param {string}  timeZone  – Zona horaria IANA del usuario
 * @param {boolean} hasEdits  – Si existen cambios pendientes que permiten mostrar “Guardar”
 * @returns {{ text: string, markup: { reply_markup: object } }}
 */
export const buildEditMenu = (task, timeZone, hasEdits = false) => {
  const name = escapeHtml(task.name)
  const descriptionText = escapeHtml(
    (task.description || '(sin descripción)').replace(/^-+|-+$/g, '')
  )
  const reminderAt = task.reminderAt
    ? formatDateEs(new Date(task.reminderAt), timeZone)
    : '(sin fecha)'

  const frequency = frequencyLabels[task.frequency] ?? task.frequency

  const text =
    `🔺 Nombre: ${name}\n` +
    `🔸 Descripción: ${descriptionText}\n` +
    `🔹 Fecha: ${reminderAt}\n` +
    `🔁 Periodicidad: ${frequency}`

  // Preparo un array de botones sin iconos
  const buttons = [
    Markup.button.callback('Nombre', 'edit_name'),
    Markup.button.callback('Descripción', 'edit_desc'),
    Markup.button.callback('Fecha', 'edit_cal'),
    Markup.button.callback('Periodicidad', 'edit_freq')
  ]

  // Solo añado “Guardar” si hay cambios pendientes
  if (hasEdits) {
    buttons.push(Markup.button.callback('Guardar', 'edit_save'))
  }
  buttons.push(Markup.button.callback('✖️ Cancelar', 'edit_cancel'))

  const keyboard = Markup.inlineKeyboard(
    // Convierto cada botón en fila de un solo botón
    buttons.map((btn) => [btn]),
    { columns: 1 }
  )

  return {
    text,
    markup: { reply_markup: keyboard.reply_markup }
  }
}
