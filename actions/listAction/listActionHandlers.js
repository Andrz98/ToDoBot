import { Task } from '../../models/task.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'

/**
 * Registra los callbacks para los botones de /list
 * @param {import('telegraf').Telegraf} bot
 */
export function registerListActions(bot) {
  // Captura cualquier callback que empiece por "show_task_"
  bot.action(/^show_task_(.+)$/, async (ctx) => {
    // 1) Extraer ID de tarea
    const taskId = ctx.match[1]
    // 2) Recuperar la tarea
    const task = await Task.findById(taskId)
    if (!task) {
      await safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
      return
    }

    // 3) Preparar el detalle de la tarea
    const nameLine = `<b>${task.name}</b>`
    const descLine = task.description
      ? `\n\n<b>🔸 Descripción:</b>\n${task.description}`
      : ''
    const dateLine = `\n\n<b>🔹 Fecha:</b> ${formatDateEs(
      task.reminderAt,
      ctx.session.timezone || 'Europe/Madrid'
    )}`

    // 4) Responder al callback con un toast
    await safeAnswerCbQuery(ctx, 'Aquí tienes los detalles de la tarea')


    // 6) Enviar los detalles completos
    return safeReply(ctx, `${nameLine}${descLine}${dateLine}`, {
      parse_mode: 'HTML'
    })
  })
}
