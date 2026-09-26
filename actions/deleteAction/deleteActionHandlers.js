// actions/deleteAction/deleteActionHandlers.js
import { Task } from '../../models/task.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import {
  DELETE_PROMPT,
  buildConfirmDeleteMenu,
  buildDeleteMenu
} from '../../helpers/taskHelpers/delete/interactiveFlowDelete.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface, renderInterface } from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  ACTION_FINISHED_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

const DELETE_DONE_TEXT = '✅ Tarea eliminada.'

/**
 * Vuelve a la lista para seguir eliminando: el usuario sale con "Finalizar
 * acción", no porque el bot le cierre el menú tras cada tarea. Sin tareas
 * pendientes no hay nada más que eliminar y el flujo se cierra.
 */
async function showDeleteList(ctx, notice = '') {
  ctx.session.pendingDelete = null
  const tasks = await findAllTasks(ctx.from.id)
  if (tasks.length === 0) {
    ctx.session.flowType = null
    return closeInterface(ctx, `${notice}📭 No te quedan tareas pendientes.`)
  }
  ctx.session.flowType = 'delete'
  return renderInterface(
    ctx,
    `${notice}${DELETE_PROMPT}`,
    buildDeleteMenu(tasks)
  )
}

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
    await safeAnswerCbQuery(ctx, ACTION_FINISHED_TEXT)
    return closeInterface(ctx, ACTION_FINISHED_TEXT)
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
      await safeAnswerCbQuery(ctx, DELETE_DONE_TEXT)
      return await showDeleteList(ctx, `${DELETE_DONE_TEXT}\n\n`)
    } catch (error) {
      console.error('❌ Error en delete_confirm:yes:', error)
      ctx.session.flowType = null
      ctx.session.pendingDelete = null
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  // 3) Confirmación "No": no borra nada y vuelve a la lista
  bot.action('delete_confirm:no', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    return showDeleteList(ctx)
  })
}
