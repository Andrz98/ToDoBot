import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'

/**
 * Construye el texto y el teclado inline para el flujo interactivo de /edit
 * @param {object}  task     - Instancia de Task de Mongoose
 * @param {string}  timeZone - Zona horaria IANA del usuario
 * @returns {{ text: string, markup: { reply_markup: object } }} Para usar en ctx.reply
 */
export const buildEditMenu = (task, timeZone) => {
  const name = task.name
  const rawDesc = task.description || '(sin descripción)'
  const descriptionText = rawDesc.replace(/^-+|-+$/g, '')

  // Formateo de fecha actual
  const reminderAt = task.reminderAt
    ? formatDateEs(new Date(task.reminderAt), timeZone)
    : '(sin fecha)'

  // Texto a mostrar
  const text =
    '<b>Edición de tarea:</b>\n' +
    `• <b>Nombre:</b> ${name}\n` +
    `• <b>Descripción:</b> ${descriptionText}\n` +
    `• <b>Recordatorio:</b> ${reminderAt}`

  // Inline keyboard con los botones de edición, y ahora “Guardar”
  const inline = Markup.inlineKeyboard([
    [Markup.button.callback('Nombre', 'edit_name')],
    [Markup.button.callback('Descripción', 'edit_desc')],
    [Markup.button.callback('Fecha', 'edit_date')],
    [Markup.button.callback('Guardar', 'edit_save')]
  ])

  return {
    text,
    markup: { reply_markup: inline.reply_markup }
  }
}
