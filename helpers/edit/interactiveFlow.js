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
  // debug para comprobar datos de la tarea
  console.log('[buildEditMenu] task:', {
    id: task,
    name: task.name,
    remiderAt: task.reminderAt
  })
  const name = task.name
  const rawDesc = task.description || '(sin descripción)'
  const descLines = rawDesc.split('\n')
  const descriptionText = descLines.map((line) => `- ${line}`).join('\n')

  const dateText = formatDateEs(task.reminderAt, timeZone)

  const text = `<b>${name}</b>\n` + `${descriptionText}\n` + `🔹 ${dateText}`

  const inline = Markup.inlineKeyboard([
    [Markup.button.callback(' Nombre', 'edit_name')],
    [Markup.button.callback(' Descripción', 'edit_desc')],
    [Markup.button.callback(' Fecha', 'edit_date')],
    [Markup.button.callback(' Cancelar', 'edit_cancel')]
  ])

  // Debuging para el DUMP de reply_markup
  console.log(['[buildEditMenu] inline.reply_markup:', inline.reply_markup])
  return { text, markup: { reply_markup: inline.reply_markup } }
}
