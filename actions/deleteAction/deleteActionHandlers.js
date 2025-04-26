// actions/deleteAction/deleteActionHandlers.js
import { Task } from '../../models/task.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { buildConfirmDeleteMenu } from '../../helpers/delete/interactiveFlowDelete.js'

/**
 * Registra los callbacks para el flujo de eliminación de tareas.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerDeleteActions(bot) {
  // 1. Usuario selecciona la atarea a leminar.
  bot.action(/^delete_select:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1]
    const task = await Task.findById(taskId)
    if (!task) {
      await ctx.answerCbQuery('Tarea no encontrada.', { show_alert: true })
      return
    }

    // Guardamos selección en sesión
    ctx.session.flowType = 'delete'
    ctx.session.pendingDelete = taskId

    await ctx.answerCbQuery()
    return ctx.reply(
      `¿Segur@ de que deseas eliminar la tarea:\n\n<b>${task.name}</b>?`,
      {
        parse_mode: 'HTML',
        ...buildConfirmDeleteMenu()
      }
    )
  })

  // 2 Confirma “Sí”
  bot.action('delete_confirm:yes', async (ctx) => {
    const taskId = ctx.session.pendingDelete
    await Task.findByIdAndDelete(taskId)

    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup() // elimina botones
    ctx.session.flowType = null
    ctx.session.pendingDelete = null

    return delayReply(ctx, 'Tarea eliminada correctamente.', 500)
  })

  // 3 Confirma “No”
  bot.action('delete_confirm:no', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup()
    ctx.session.flowType = null
    ctx.session.pendingDelete = null

    return delayReply(ctx, 'Operación cancelada.', 500)
  })
}
