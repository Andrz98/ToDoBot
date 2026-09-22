import { findTask } from '../../helpers/tasks/findTask.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import {
  buildTaskListPage,
  buildTaskDetail
} from '../../helpers/taskHelpers/list/interactiveFlowList.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import {
  TTL,
  scheduleDeletion
} from '../../utils/telegramUtils/messageLifecycle.js'

// Navegar sustituye el contenido del mismo mensaje; su TTL lo renueva chatCleanup al pulsar
const showInList = (ctx, { text, reply_markup }) =>
  ctx
    .editMessageText(text, { parse_mode: 'HTML', reply_markup })
    .catch((error) => debugLog('📋 [list] edición omitida:', error?.message))

async function showPage(ctx, page) {
  const tasks = await findAllTasks(ctx.from.id)
  if (tasks.length === 0) {
    await showInList(ctx, {
      text: '📭 No tienes tareas activas.',
      reply_markup: { inline_keyboard: [] }
    })
    return scheduleDeletion(ctx, ctx.callbackQuery?.message?.message_id, TTL.NOTICE)
  }
  return showInList(ctx, buildTaskListPage(tasks, page))
}

/**
 * Registra los callbacks del listado de /list (solo lectura).
 * @param {import('telegraf').Telegraf} bot
 */
export function registerListActions(bot) {
  bot.action('list_noop', (ctx) => safeAnswerCbQuery(ctx))

  bot.action(/^list_page_(\d+)$/, async (ctx) => {
    await safeAnswerCbQuery(ctx)
    return showPage(ctx, Number(ctx.match[1]))
  })

  bot.action(/^show_task_([^:]+)(?::(\d+))?$/, async (ctx) => {
    const page = Number(ctx.match[2] ?? 0)
    const task = await findTask(ctx.from.id, { id: ctx.match[1] })
    if (!task) {
      await safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
      return showPage(ctx, page)
    }

    const timezone = await getUserTimezone(ctx.from.id)
    await safeAnswerCbQuery(ctx)
    return showInList(ctx, buildTaskDetail(task, timezone, page))
  })
}
