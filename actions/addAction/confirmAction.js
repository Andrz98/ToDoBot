import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  closeInterface,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'
import { Task } from '../../models/task.js'
import { DEFAULT_FREQUENCY } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'

const DUPLICATE_KEY = 11000
const ADD_DONE_TEXT = '✅ Tarea creada.'
const ADD_CANCELLED_TEXT = 'Creación cancelada.'

function resetAddSession(ctx) {
  delete ctx.session.flowType
  delete ctx.session.awaiting
  delete ctx.session.pendingTask
}

/**
 * Cuando el usuario pulsa "Confirmar creación"
 * Guardamos la tarea y salimos del flujo.
 */
export function registerConfirmAction(bot) {
  bot.action('add_confirm', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    const { pendingTask } = ctx.session
    if (!pendingTask?.name || !pendingTask?.reminderAt) {
      return safeAnswerCbQuery(
        ctx,
        'La sesión expiró. Usa /add para empezar de nuevo.',
        { show_alert: true }
      )
    }
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }

    const task = new Task({
      userId: ctx.from.id,
      name: pendingTask.name,
      description: pendingTask.description || '(sin descripción)',
      frequency: pendingTask.frequency ?? DEFAULT_FREQUENCY,
      reminderAt: pendingTask.reminderAt
    })

    try {
      await task.save()
    } catch (error) {
      if (error.code === DUPLICATE_KEY) {
        return safeAnswerCbQuery(
          ctx,
          'Ya existe una tarea con ese nombre (puede estar completada: /clear las elimina). Corrige el nombre.',
          { show_alert: true }
        )
      }
      console.error('❌ Error en add_confirm:', error)
      resetAddSession(ctx)
      await closeInterface(ctx, GENERAL_ERROR_TEXT)
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }

    await safeAnswerCbQuery(ctx, ADD_DONE_TEXT)
    const timezone = await getUserTimezone(ctx.from.id).catch(() => undefined)
    resetAddSession(ctx)
    await closeInterface(
      ctx,
      `${ADD_DONE_TEXT}\n\n🔺 ${pendingTask.name}\n🔹 ${formatDateEs(
        new Date(pendingTask.reminderAt),
        timezone
      )}`
    )
  })

  bot.action('add_cancel', async (ctx) => {
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    await safeAnswerCbQuery(ctx, ADD_CANCELLED_TEXT)
    resetAddSession(ctx)
    await closeInterface(ctx, ADD_CANCELLED_TEXT)
  })
}
