// actions/deleteAction/deleteActionHandlers.js
import { Task } from '../../models/task.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { buildConfirmDeleteMenu } from '../../helpers/taskHelpers/delete/interactiveFlowDelete.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface, renderInterface } from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  OPERATION_CANCELLED_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

const DELETE_DONE_TEXT = '✅ Tarea eliminada.'

/**
 * Registra los callbacks para el flujo de eliminación de tareas.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerDeleteActions(bot) {
  // 1) Selección de la tarea a eliminar
  bot.action(/^delete_select:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1]
    const task = await findTask(ctx.from.id, { id: taskId })
    if (!task) {
      await safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
      return
    }

    // Iniciamos el flujo delete
    ctx.session.flowType = 'delete'
    ctx.session.pendingDelete = taskId

    await safeAnswerCbQuery(ctx)
    const { text, reply_markup } = buildConfirmDeleteMenu(task)
    return renderInterface(ctx, text, { parse_mode: 'HTML', reply_markup })
  })

  bot.action('delete_cancel', async (ctx) => {
    ctx.session.flowType = null
    ctx.session.pendingDelete = null
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })

  // 2) Confirmación "Sí"
  bot.action('delete_confirm:yes', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      ctx.session.flowType = null
      ctx.session.pendingDelete = null
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    const taskId = ctx.session.pendingDelete
    if (!taskId) {
      // Doble-tap: la sesión ya se resolvió o expiró
      return safeAnswerCbQuery(ctx, 'Esta acción ya fue procesada o expiró.', {
        show_alert: true
      })
    }

    try {
      const task = await Task.findOneAndDelete({
        _id: taskId,
        userId: ctx.from.id
      })
      await dismissReminder(ctx, task)
      ctx.session.flowType = null
      ctx.session.pendingDelete = null
      await safeAnswerCbQuery(ctx, DELETE_DONE_TEXT)
      return closeInterface(ctx, DELETE_DONE_TEXT)
    } catch (error) {
      console.error('❌ Error en delete_confirm:yes:', error)
      ctx.session.flowType = null
      ctx.session.pendingDelete = null
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  // 3) Confirmación "No"
  bot.action('delete_confirm:no', async (ctx) => {
    ctx.session.flowType = null
    ctx.session.pendingDelete = null
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })
}
