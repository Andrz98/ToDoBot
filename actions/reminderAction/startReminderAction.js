// 📁 actions/reminderAction/startReminderAction.js

import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { frequencyLabels } from '../../helpers/frequency/frequencyLabels.js'

export const startReminderAction = async (ctx) => {
  ctx.session.flowType = 'reminder'
  const userId = ctx.from.id
  const tasks = await findAllTasks(userId)

  if (!tasks.length) {
    ctx.session.flowType = null
    return safeReply(
      ctx,
      '😕 No tienes tareas activas para configurar recordatorios.'
    )
  }

  const buttons = tasks.map((task) => {
    const label = `${task.name} — ${
      task.reminderAt ? frequencyLabels[task.frequency] : 'Sin recordatorio'
    }`

    return [
      {
        text: label,
        callback_data: `setReminder::${task._id}`
      }
    ]
  })

  const msg = await ctx.reply(
    'Selecciona una tarea para configurar su recordatorio:',
    {
      reply_markup: {
        inline_keyboard: buttons
      }
    }
  )
  ctx.session.menuMessageId = msg.message_id
  return msg
}
