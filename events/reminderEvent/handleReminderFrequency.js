import { Task } from '../../models/task.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { buildFrequencyMenu } from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'

export const handleReminderFrequency = async (ctx) => {
  const callbackData = ctx.callbackQuery.data
  const [, taskId] = callbackData.split('::')

  const task = await Task.findById(taskId)
  if (!task) {
    return ctx.answerCbQuery('Tarea no encontrada.')
  }

  const { text, markup } = buildFrequencyMenu()
  const frequencyOptions = markup.reply_markup.inline_keyboard.map((row) => {
    const button = row[0]
    const value = button.callback_data.replace('add_freq_', '')
    return [
      {
        text: button.text,
        callback_data: `saveReminder::${taskId}::${value}`
      }
    ]
  })

  await ctx.answerCbQuery()

  try {
    await ctx.editMessageText(text, markup)
  } catch {
    await ctx.reply(text, markup)
  }

  return safeEditMessageReplyMarkup(ctx, {
    reply_markup: {
      inline_keyboard: frequencyOptions
    }
  })
}
