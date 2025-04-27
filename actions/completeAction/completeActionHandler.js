// actions/completeAction/completeActionHandlers.js
import { Task } from '../../models/task.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { buildConfirmCompleteMenu } from '../../helpers/Complete/interactiveFlowComplete.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'

/**
 * Registra los callbacks para el flujo de completar tareas.
 */
export function registerCompleteActions(bot) {
  // 1) Usuario selecciona la tarea a completar
  bot.action(/^complete_select:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1]
    const task = await Task.findById(taskId)
    if (!task) {
      await ctx.answerCbQuery('Tarea no encontrada.', { show_alert: true })
      return
    }

    // Guardamos selección en sesión
    ctx.session.flowType = 'complete'
    ctx.session.pendingComplete = taskId

    await ctx.answerCbQuery()
    return safeReply(
      ctx,
      `¿Estás segur@ de marcar como completada la tarea:\n\n<b>${task.name}</b>?`,
      {
        parse_mode: 'HTML',
        ...buildConfirmCompleteMenu(task.name)
      }
    )
  })

  // 2 Confirma “Sí”
  bot.action('complete_confirm:yes', async (ctx) => {
    const taskId = ctx.session.pendingComplete
    await Task.findByIdAndUpdate(taskId, { completed: true })

    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup() // elimina botones
    ctx.session.flowType = null
    ctx.session.pendingComplete = null

    return delayReply(ctx, 'Tarea completada correctamente.', 500)
  })

  // 3 Confirma “No”
  bot.action('complete_confirm:no', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup()
    ctx.session.flowType = null
    ctx.session.pendingComplete = null

    return delayReply(ctx, 'Operación cancelada.', 500)
  })
}
