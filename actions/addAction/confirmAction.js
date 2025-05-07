import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { Task } from '../../models/task.js'

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

    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask

    return delayReply(
      ctx,
      `Tarea creada:\n• ${task.name}\n• ${task.description}\n• ${task.reminderAt.toLocaleString()}`
    )
  })
}
