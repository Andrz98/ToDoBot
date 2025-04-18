import cron from 'node-cron'
import { Task } from '../../models/task.js'
import { bot } from '../../config/telegraf/telegraf.js'

/**
 * Scheduler que revisa cada minuto si hay tareas con recordatorio activo.
 * Hecho el reconocimiento, envía un mensaje automático al usuario
 */

export const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    const now = new Date()

    const alertMessage = [
      { label: '72', ms: 72 * 60 * 60 * 1000 },
      { label: '48', ms: 48 * 60 * 60 * 1000 },
      { label: '24', ms: 24 * 60 * 60 * 1000 },
      { label: '7h', ms: 7 * 60 * 60 * 1000 },
      { label: '3h', ms: 3 * 60 * 60 * 1000 },
      { label: '10min', ms: 10 * 60 * 1000 }
    ]

    try {
      const tasks = await Task.find({
        completed: false
      })

      for (const task of tasks) {
        const diff = task.reminderAt.getTime() - now.getTime()
        if (diff < 0) {
          continue
        } // La tarea no tiene recordatorio activo, ya pasó

        const alerts = task.alertsSent || []

        for (const message of alertMessage) {
          const delta = Math.abs(diff - message.ms)
          if (delta <= 60 * 1000 && !alerts.includes(message.label)) {
            await bot.telegram.sendMessage(
              task.userId,
              `⌚ Recordatorio (${message.label} antes):\nTarea "${task.name}" programada para el ${task.reminderAt.toLocaleString(
                'es-ES',
                {
                  dateStyle: 'full',
                  timeStyle: 'short'
                }
              )}`
            )
            console.log(`🛎️ ${message.label} → ${task.userId}: ${task.name}`)
            alerts.push(message.label)
            break // Envío un solo recordatorio de tarea por minuto
          }
        }

        task.alertsSent = alerts
        await task.save()
      }
    } catch (error) {
      console.error('😵‍💫 Error al enviar recordatorio múltiple:', error.message)
    }
  })
}
