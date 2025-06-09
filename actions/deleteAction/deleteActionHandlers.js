// actions/deleteAction/deleteActionHandlers.js
import { Task } from '../../models/task.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { buildConfirmDeleteMenu } from '../../helpers/taskHelpers/delete/interactiveFlowDelete.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
/**
 * Registra los callbacks para el flujo de eliminación de tareas.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerDeleteActions(bot) {
  // 1) Selección de la tarea a eliminar
  bot.action(/^delete_select:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1]
    const task = await Task.findById(taskId)
    if (!task) {
      await safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
      return
    }

    // Iniciamos el flujo delete
    ctx.session.flowType = 'delete'
    ctx.session.pendingDelete = taskId

    await safeAnswerCbQuery(ctx)
    const { text, reply_markup } = buildConfirmDeleteMenu(task)
    return safeReply(ctx, text, { parse_mode: 'HTML', reply_markup })
  })

  // 2) Confirmación “Sí”
  bot.action('delete_confirm:yes', async (ctx) => {
    const taskId = ctx.session.pendingDelete
    await Task.findByIdAndDelete(taskId)

    await safeAnswerCbQuery(ctx, '👌🏽 Tarea eliminada')
    await safeEditMessageReplyMarkup(ctx)
    // Limpiamos el flujo
    ctx.session.flowType = null
    ctx.session.pendingDelete = null
  })

  // 3) Confirmación “No”
  bot.action('delete_confirm:no', async (ctx) => {
    await safeAnswerCbQuery(ctx, 'Operación cancelada.')
    await safeEditMessageReplyMarkup(ctx)
    ctx.session.flowType = null
    ctx.session.pendingDelete = null
  })
}
