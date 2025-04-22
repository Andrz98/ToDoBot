import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'

/**
 * Construye el texto y el teclado inline para el flujo interactivo de /edit
 * @param {object} task     - Instancia de Task de Mongoose
 * @param {string} timeZone - Zona horaria IANA del usuario
 * @returns {{ text: string, markup: object }} Para usar en ctx.reply
 */

export const buildEditMenu = (task, timeZone) => {
  const description = task.description || '(sin descripción)'
  const dateText = formatDateEs(task.reminderAt, timeZone)

  const text =
    `<b>${task.name}</b>\n` + `🔸 ${description}\n` + `🔹 ${dateText}`

  const markup = Markup.inlineKeyboard([
    [Markup.button.callback('✔️ Nombre', 'edit_name')],
    [Markup.button.callback('🔸 Descripción', 'edit_desc')],
    [Markup.button.callback('🔹 Fecha', 'edit_date')],
    [Markup.button.callback('✖️ Cancelar', 'edit_cancel')]
  ])

  return { text, markup: markup.reply_markup }
}
