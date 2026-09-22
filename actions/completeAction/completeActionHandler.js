// actions/completeAction/completeActionHandlers.js
import { Task } from '../../models/task.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { buildConfirmCompleteMenu } from '../../helpers/taskHelpers/Complete/interactiveFlowComplete.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface, renderInterface } from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  OPERATION_CANCELLED_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

const COMPLETE_DONE_TEXT = '✅ Tarea completada.'

/**
 * Registra los callbacks para el flujo de completar tareas.
 */
export function registerCompleteActions(bot) {
  // 1) Usuario selecciona la tarea a completar
  bot.action(/^complete_select:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1]
    const task = await findTask(ctx.from.id, { id: taskId })
    if (!task) {
      await safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
      return
    }

    // Guardamos selección en sesión
    ctx.session.flowType = 'complete'
    ctx.session.pendingComplete = taskId

    await safeAnswerCbQuery(ctx)
    return renderInterface(
      ctx,
      `¿Estás segur@ de marcar como completada la tarea:\n\n<b>${escapeHtml(task.name)}</b>?`,
      {
        parse_mode: 'HTML',
        ...buildConfirmCompleteMenu()
      }
    )
  })

  bot.action('complete_cancel', async (ctx) => {
    ctx.session.flowType = null
    ctx.session.pendingComplete = null
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })

  // 2) Confirma "Sí"
  bot.action('complete_confirm:yes', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      ctx.session.flowType = null
      ctx.session.pendingComplete = null
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    const taskId = ctx.session.pendingComplete
    if (!taskId) {
      return safeAnswerCbQuery(ctx, 'Esta acción ya fue procesada o expiró.', {
        show_alert: true
      })
    }

    try {
      await Task.findOneAndUpdate(
        { _id: taskId, userId: ctx.from.id },
        { completed: true }
      )
      ctx.session.flowType = null
      ctx.session.pendingComplete = null
      await safeAnswerCbQuery(ctx, COMPLETE_DONE_TEXT)
      return closeInterface(ctx, COMPLETE_DONE_TEXT)
    } catch (error) {
      console.error('❌ Error en complete_confirm:yes:', error)
      ctx.session.flowType = null
      ctx.session.pendingComplete = null
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  // 3) Confirma "No"
  bot.action('complete_confirm:no', async (ctx) => {
    ctx.session.flowType = null
    ctx.session.pendingComplete = null
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })
}
