import { Task } from '../../models/task.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'

export const handleReminderFrequency = async (ctx) => {
  const callbackData = ctx.callbackQuery.data
  const [, taskId] = callbackData.split('::')

  const task = await Task.findById(taskId)
  if (!task) {
    return ctx.answerCbQuery('Tarea no encontrada.')
  }

  const frequencyOptions = [
    [{ text: 'Diario', callback_data: `saveReminder::${taskId}::daily` }],
    [{ text: 'Semanal', callback_data: `saveReminder::${taskId}::weekly` }],
    [{ text: 'Mensual', callback_data: `saveReminder::${taskId}::monthly` }],
    [{ text: 'Anual', callback_data: `saveReminder::${taskId}::yearly` }]
  ]

  await ctx.answerCbQuery()

  return safeEditMessageReplyMarkup(ctx, {
    reply_markup: {
      inline_keyboard: frequencyOptions
    }
  })
}
