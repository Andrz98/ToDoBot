// helpers/edit/interactiveFlow.js
import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'

/**
 * Construye el texto y el teclado inline para el flujo interactivo de /edit
 * @param {object}  task     - Instancia de Task de Mongoose
 * @param {string}  timeZone - Zona horaria IANA del usuario
 * @returns {{ text: string, markup: object }} Para usar en ctx.reply
 */
export const buildEditMenu = (task, timeZone) => {
  const name = task.name
  const rawDesc = task.description || '(sin descripción)'
  const descLines = rawDesc.split('\n')
  const descriptionText = descLines.map((line) => `🔸 ${line}`).join('\n')

  const dateText = formatDateEs(task.reminderAt, timeZone)

  const text = `<b>${name}</b>\n` + `${descriptionText}\n` + `🔹 ${dateText}`

  const markup = Markup.inlineKeyboard([
    [Markup.button.callback('✔️ Nombre', 'edit_name')],
    [Markup.button.callback('🔸 Descripción', 'edit_desc')],
    [Markup.button.callback('🔹 Fecha', 'edit_date')],
    [Markup.button.callback('✖️ Cancelar', 'edit_cancel')]
  ])

  return { text, markup: markup.reply_markup }
}
