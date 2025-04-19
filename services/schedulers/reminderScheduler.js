import cron from 'node-cron'
import { Task } from '../../models/task.js'
import { bot } from '../../config/telegraf/telegraf.js'

/**
 * Scheduler que revisa cada minuto si hay tareas con recordatorio activo.
 * Si detecta una coincidencia con alguna ventana de alerta, envía mensaje automático.
 */

export const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    const now = new Date()

    const alertMessage = [
      { label: '72h', ms: 72 * 60 * 60 * 1000 },
      { label: '48h', ms: 48 * 60 * 60 * 1000 },
      { label: '24h', ms: 24 * 60 * 60 * 1000 },
      { label: '7h', ms: 7 * 60 * 60 * 1000 },
      { label: '3h', ms: 3 * 60 * 60 * 1000 },
      { label: '10min', ms: 10 * 60 * 1000 }
    ]

    try {
      const tasks = await Task.find({ completed: false })

      for (const task of tasks) {
        const diff = task.reminderAt.getTime() - now.getTime()
        if (diff < 0) {
          continue
        } // Tarea vencida

        const alerts = task.alertsSent || []

        for (const window of alertMessage) {
          const delta = Math.abs(diff - window.ms)
          if (delta <= 60 * 1000 && !alerts.includes(window.label)) {
            await bot.telegram.sendMessage(
              task.userId,
              `⌚ <b>Recordatorio (${window.label} antes)</b>:\n<b>${task.name}</b>\n` +
                `📅 Programado para el ${task.reminderAt.toLocaleString(
                  'es-ES',
                  {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  }
                )}`,
              { parse_mode: 'HTML' }
            )
            console.log(`🛎️ ${window.label} → ${task.userId}: ${task.name}`)
            alerts.push(window.label)
            break
          }
        }

        task.alertsSent = alerts
        await task.save()
      }
    } catch (error) {
      console.error('😵‍💫 Error al enviar recordatorios:', error.message)
    }
  })
}
