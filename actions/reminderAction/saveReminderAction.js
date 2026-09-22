import { findTask } from '../../helpers/tasks/findTask.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { GENERAL_ERROR_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'

const addIntervalToNow = (frequency) => {
  const now = new Date()
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1)
      break
  }
  return now
}

export const saveReminderAction = async (ctx) => {
  const callbackData = ctx.callbackQuery.data
  const [, taskId, frequency] = callbackData.split('::')

  const task = await findTask(ctx.from.id, { id: taskId })
  if (!task) {
    return ctx.answerCbQuery('Tarea no encontrada.')
  }

  try {
    task.frequency = frequency
    task.reminderAt = addIntervalToNow(frequency)
    task.alertsSent = [] // Resetea las alertas pasadas

    await task.save()
    await ctx.answerCbQuery()
    // Quitamos el teclado de frecuencia: ya cumplió su función y no debe
    // quedar pulsable (re-ejecutaría el guardado con otra frecuencia)
    await safeEditMessageReplyMarkup(ctx)

    ctx.session.flowType = null
    delete ctx.session.menuMessageId

    return flashReply(
      ctx,
      `Se ha configurado el recordatorio para la tarea "${task.name}" con frecuencia "${frequency}".`,
      {},
      2500
    )
  } catch (error) {
    console.error('❌ Error en saveReminderAction:', error)
    ctx.session.flowType = null
    delete ctx.session.menuMessageId
    return ctx.answerCbQuery(GENERAL_ERROR_TEXT, { show_alert: true })
  }
}
