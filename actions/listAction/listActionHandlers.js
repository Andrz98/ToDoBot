import { findTask } from '../../helpers/tasks/findTask.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'

/**
 * Registra los callbacks para los botones de /list
 * @param {import('telegraf').Telegraf} bot
 */
export function registerListActions(bot) {
  // Captura cualquier callback que empiece por "show_task_"
  bot.action(/^show_task_(.+)$/, async (ctx) => {
    // 1) Extraer ID de tarea
    const taskId = ctx.match[1]
    // 2) Recuperar la tarea, solo si pertenece al usuario que pulsa
    const task = await findTask(ctx.from.id, { id: taskId })
    if (!task) {
      await safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
      return
    }

    // 3) Preparar el detalle de la tarea
    const timezone = await getUserTimezone(ctx.from.id)
    const nameLine = `<b>${escapeHtml(task.name)}</b>`
    const descLine = task.description
      ? `\n\n<b>🔸 Descripción:</b>\n${escapeHtml(task.description)}`
      : ''
    const dateLine = `\n\n<b>🔹 Fecha:</b> ${formatDateEs(
      task.reminderAt,
      timezone
    )}`

    // 4) Responder al callback con un toast
    await safeAnswerCbQuery(ctx, 'Aquí tienes los detalles de la tarea')

    // 5) Enviar los detalles completos
    return safeReply(ctx, `${nameLine}${descLine}${dateLine}`, {
      parse_mode: 'HTML'
    })
  })
}
