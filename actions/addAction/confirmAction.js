// actions/addAction/confirmAction.js

import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { Task } from '../../models/task.js'

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

    // Limpiamos la sesión
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    delete ctx.session.menuMessageId

    return delayReply(
      ctx,
      'Tarea creada:\n' +
        `• Nombre: ${task.name}\n` +
        `• Descripción: ${task.description}\n` +
        `• Fecha: ${task.reminderAt.toLocaleString()}`
    )
  })
}
