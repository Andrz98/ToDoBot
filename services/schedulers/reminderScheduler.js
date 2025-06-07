import cron from 'node-cron'
import { Task } from '../../models/task.js'
import { bot } from '../../config/telegraf/telegraf.js'
import { safeSendMessage } from '../../utils/retryUtils/safeSendMessage.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'

/**
 * Scheduler que revisa cada minuto si hay tareas con recordatorio activo.
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
        }

        const timezone = await getUserTimezone(task.userId)
        const alerts = task.alertsSent || []

        for (const window of alertMessage) {
          const delta = Math.abs(diff - window.ms)
          if (delta <= 60 * 1000 && !alerts.includes(window.label)) {
            const formattedDate = formatDateEs(task.reminderAt, timezone)

            await safeSendMessage(
              bot,
              task.userId,
              `⌚ <b>Recordatorio (${window.label} antes)</b>:\n<b>${task.name}</b>\n` +
                `📅 Programado para el ${formattedDate}`,
              { parse_mode: 'HTML' }
            )

            debugLog(`🛎️ ${window.label} → ${task.userId}: ${task.name}`)
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
