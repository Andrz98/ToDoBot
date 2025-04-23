// src/actions/listActionHandlers.js
import { Task } from '../models/task.js'
import { formatDateEs } from '../helpers/userTimezone/formatDateEs.js'

/**
 * Registra los callbacks para los botones de /list
 * @param {import('telegraf').Telegraf} bot
 */
export function registerListActions(bot) {
  // Capturo cualquier callback que empiece por "show_task_"
  bot.action(/^show_task_(.+)$/, async (ctx) => {
    // 1) Extraer ID de tarea
    const taskId = ctx.match[1] // lo que viene tras "show_task_"
    // 2) Recuperar tarea
    const task = await Task.findById(taskId)
    if (!task) {
      await ctx.answerCbQuery('Tarea no encontrada.', { show_alert: true })
      return
    }

    // 3) Formateo el detalle de la tarea
    const nameLine = `<b>${task.name}</b>`
    const descLine = task.description
      ? `\n\n<b>🔸 Descripción:</b>\n${task.description}`
      : ''
    const dateLine = `\n\n<b>🔹 Fecha:</b> ${formatDateEs(task.reminderAt, ctx.session.timezone || 'Europe/Madrid')}`

    // 4) Responder al callback (quita el spinner)
    await ctx.answerCbQuery()
    // 5) Enviar los detalles
    return ctx.reply(`${nameLine}${descLine}${dateLine}`, {
      parse_mode: 'HTML'
    })
  })
}
