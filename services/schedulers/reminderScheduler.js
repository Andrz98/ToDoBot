import cron from 'node-cron'
import { Task } from '../../models/task.js'
import { bot } from '../../config/telegraf/telegraf.js'
import { safeSendMessage } from '../../utils/retryUtils/safeSendMessage.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'

const alertMessage = [
  { label: '72h', ms: 72 * 60 * 60 * 1000 },
  { label: '48h', ms: 48 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7h', ms: 7 * 60 * 60 * 1000 },
  { label: '3h', ms: 3 * 60 * 60 * 1000 },
  { label: '10min', ms: 10 * 60 * 1000 }
]

/**
 * Envía el aviso que toque para una tarea y persiste las alertas ya enviadas.
 */
const notifyTask = async (task, now) => {
  if (!task.reminderAt) {
    return
  }

  const diff = task.reminderAt.getTime() - now.getTime()
  if (diff < 0) {
    return
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
        `⌚ <b>Recordatorio (${window.label} antes)</b>:\n<b>${escapeHtml(task.name)}</b>\n` +
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

/**
 * Scheduler que revisa cada minuto si hay tareas con recordatorio activo.
 */
export const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    const now = new Date()

    try {
      const tasks = await Task.find({ completed: false })

      for (const task of tasks) {
        // Un fallo en una tarea (403 bot bloqueado, usuario huérfano…) no frena al resto
        try {
          await notifyTask(task, now)
        } catch (error) {
          console.error(
            `😵‍💫 Error en el recordatorio de la tarea ${task._id}:`,
            error.message
          )
        }
      }
    } catch (error) {
      console.error('😵‍💫 Error al enviar recordatorios:', error.message)
    }
  })
}
