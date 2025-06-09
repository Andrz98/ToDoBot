import { Task } from '../../models/task.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

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

  const task = await Task.findById(taskId)
  if (!task) {
    return safeAnswerCbQuery(ctx, 'Tarea no encontrada.')
  }

  task.frequency = frequency
  task.reminderAt = addIntervalToNow(frequency)
  task.alertsSent = [] // Resetea las alertas pasadas

  await task.save()
  await safeAnswerCbQuery(ctx)

  return flashReply(
    ctx,
    `Se ha configurado el recordatorio para la tarea "${task.name}" con frecuencia "${frequency}".`,
    {},
    2500
  )
}
