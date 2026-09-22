import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { Task } from '../../models/task.js'

const DUPLICATE_KEY = 11000

/**
 * Cuando el usuario pulsa “Confirmar creación”
 * Guardamos la tarea y salimos del flujo.
 */
export function registerConfirmAction(bot) {
  bot.action('add_confirm', async (ctx) => {
    const { pendingTask } = ctx.session
    if (!pendingTask?.name || !pendingTask?.reminderAt) {
      return safeAnswerCbQuery(
        ctx,
        'La sesión expiró. Usa /add para empezar de nuevo.',
        { show_alert: true }
      )
    }

    const task = new Task({
      userId: ctx.from.id,
      name: pendingTask.name,
      description: pendingTask.description || '(sin descripción)',
      frequency: 'daily',
      reminderAt: pendingTask.reminderAt
    })

    try {
      await task.save()
    } catch (error) {
      if (error.code === DUPLICATE_KEY) {
        return safeAnswerCbQuery(
          ctx,
          'Ya existe una tarea con ese nombre (puede estar completada: /clear las elimina). Usa /add con otro nombre.',
          { show_alert: true }
        )
      }
      throw error
    }

    await safeAnswerCbQuery(ctx, '👌🏽 Tarea creada')
    await safeEditMessageReplyMarkup(ctx)

    if (ctx.callbackQuery?.message) {
      await ctx.deleteMessage().catch(() => {})
    }

    // Limpiamos la sesión
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    delete ctx.session.menuMessageId

    flashReply(ctx, '👌🏽 Tarea creada')
  })
}
