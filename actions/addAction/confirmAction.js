import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { Task } from '../../models/task.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'

/**
 * Cuando el usuario pulsa “Confirmar creación”
 * Guardamos la tarea y salimos del flujo.
 */
export function registerConfirmAction(bot) {
  bot.action('add_confirm', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    const { pendingTask } = ctx.session
    const userId = ctx.from.id

    const task = new Task({
      userId,
      name: pendingTask.name,
      description: pendingTask.description || '(sin descripción)',
      frequency: 'daily',
      reminderAt: pendingTask.reminderAt || new Date()
    })
    await task.save()

    const timezone = await getUserTimezone(userId)

    // Limpiamos la sesión
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    delete ctx.session.menuMessageId

    flashReply(ctx, '👌🏽 Tarea creada')
  })
}
