// actions/completeAction/completeActionHandlers.js
import { Task } from '../../models/task.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import {
  COMPLETE_PROMPT,
  buildCompleteMenu,
  buildConfirmCompleteMenu
} from '../../helpers/taskHelpers/Complete/interactiveFlowComplete.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface, renderInterface } from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  ACTION_FINISHED_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

const COMPLETE_DONE_TEXT = '✅ Tarea completada.'

/**
 * Vuelve a la lista para seguir completando: el usuario sale con "Finalizar
 * acción", no porque el bot le cierre el menú tras cada tarea. Sin tareas
 * pendientes no hay nada más que completar y el flujo se cierra.
 */
async function showCompleteList(ctx, notice = '') {
  ctx.session.pendingComplete = null
  const tasks = await findAllTasks(ctx.from.id)
  if (tasks.length === 0) {
    ctx.session.flowType = null
    return closeInterface(ctx, `${notice}📭 No te quedan tareas pendientes.`)
  }
  ctx.session.flowType = 'complete'
  return renderInterface(
    ctx,
    `${notice}${COMPLETE_PROMPT}`,
    buildCompleteMenu(tasks)
  )
}

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
    await safeAnswerCbQuery(ctx, ACTION_FINISHED_TEXT)
    return closeInterface(ctx, ACTION_FINISHED_TEXT)
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
      const task = await Task.findOneAndUpdate(
        { _id: taskId, userId: ctx.from.id },
        { completed: true }
      )
      await dismissReminder(ctx, task)
      await safeAnswerCbQuery(ctx, COMPLETE_DONE_TEXT)
      return await showCompleteList(ctx, `${COMPLETE_DONE_TEXT}\n\n`)
    } catch (error) {
      console.error('❌ Error en complete_confirm:yes:', error)
      ctx.session.flowType = null
      ctx.session.pendingComplete = null
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  // 3) Confirma "No": no completa nada y vuelve a la lista
  bot.action('complete_confirm:no', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    return showCompleteList(ctx)
  })
}
