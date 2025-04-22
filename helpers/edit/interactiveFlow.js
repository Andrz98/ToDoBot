import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'

/**
 * Construye el texto y el teclado inline para el flujo interactivo de /edit
 * @param {object}  task     - Instancia de Task de Mongoose
 * @param {string}  timeZone - Zona horaria IANA del usuario
 * @returns {{ text: string, markup: { reply_markup: object } }} Para usar en ctx.reply
 */
export const buildEditMenu = (task, timeZone) => {
  // 1) Cabecera con nombre de la tarea
  const header = `<b>1. ${task.name}</b>`

  // 2) Formateo de la descripción como bloque preformateado
  const rawDesc = task.description || '(sin descripción)'
  const descLines = rawDesc.split('\n').map((line) => `- ${line}`)
  const descriptionBlock = `<b>🔸 Descripción:</b>\n<pre>${descLines.join('\n')}</pre>`

  // 3) Formateo de la fecha
  const dateText = formatDateEs(task.reminderAt, timeZone)
  const dateBlock = `<b>🔹 Fecha:</b>\n${dateText}`

  // 4) Construcción del texto final, con líneas en blanco entre secciones
  const text = [header, '', descriptionBlock, '', dateBlock].join('\n')

  // 5) Inline keyboard (botones)
  const inline = Markup.inlineKeyboard([
    [Markup.button.callback('✔️ Nombre', 'edit_name')],
    [Markup.button.callback('🔸 Descripción', 'edit_desc')],
    [Markup.button.callback('🔹 Fecha', 'edit_date')],
    [Markup.button.callback('✖️ Cancelar/terminar', 'edit_cancel')]
  ])

  // 6) Devolvemos el objeto listo para ctx.reply
  return {
    text,
    markup: {
      reply_markup: inline.reply_markup
    }
  }
}
