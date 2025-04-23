import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'

/**
 * Construye el texto y el teclado inline para el flujo interactivo de /edit
 * @param {object}  task     - Instancia de Task de Mongoose
 * @param {string}  timeZone - Zona horaria IANA del usuario
 * @returns {{ text: string, markup: { reply_markup: object } }} Para usar en ctx.reply
 */
export const buildEditMenu = (task, timeZone) => {
  // Nombre de la tarea (en negrita)
  const name = task.name

  // Descripción: limpiamos posibles guiones existentes y añadimos uno único
  const rawDesc = task.description || '(sin descripción)'
  const descriptionText = rawDesc
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .map((line) => `- ${line}`)
    .join('\n')

  // Fecha formateada en español según la zona horaria
  const dateText = formatDateEs(task.reminderAt, timeZone)

  // Montaje del texto completo con saltos en blanco para legibilidad
  const text =
    `<b>${name}</b>\n\n` + `${descriptionText}\n\n` + `🔹 ${dateText}`

  // Inline keyboard con los botones de edición
  const inline = Markup.inlineKeyboard([
    [Markup.button.callback(' Nombre', 'edit_name')],
    [Markup.button.callback('Descripción', 'edit_desc')],
    [Markup.button.callback('Fecha', 'edit_date')],
    [Markup.button.callback('Cancelar', 'edit_cancel')]
  ])

  return {
    text,
    markup: { reply_markup: inline.reply_markup }
  }
}
