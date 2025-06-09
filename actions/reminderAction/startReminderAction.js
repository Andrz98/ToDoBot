// 📁 actions/reminderAction/startReminderAction.js

import { getActiveTasksByUser } from '../../helpers/taskHelpers/edit/taskSelection.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'

export const startReminderAction = async (ctx) => {
  const userId = ctx.from.id
  const tasks = await getActiveTasksByUser(userId)

  if (!tasks.length) {
    return safeReply(
      ctx,
      '😕 No tienes tareas activas para configurar recordatorios.'
    )
  }

  const buttons = tasks.map((task) => {
    const freqMap = {
      daily: 'Diario',
      weekly: 'Semanal',
      monthly: 'Mensual',
      yearly: 'Anual'
    }

    const label = `${task.name} — ${
      task.reminderAt ? freqMap[task.frequency] : 'Sin recordatorio'
    }`

    return [
      {
        text: label,
        callback_data: `setReminder::${task._id}`
      }
    ]
  })

  return ctx.reply('Selecciona una tarea para configurar su recordatorio:', {
    reply_markup: {
      inline_keyboard: buttons
    }
  })
}
