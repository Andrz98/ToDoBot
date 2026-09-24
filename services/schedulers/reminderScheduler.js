import cron from 'node-cron'
import { Task } from '../../models/task.js'
import { bot } from '../../config/telegraf/telegraf.js'
import { safeSendMessage } from '../../utils/retryUtils/safeSendMessage.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import { scheduleDeletion } from '../../utils/telegramUtils/messageLifecycle.js'
import {
  reminderKeyboard,
  dismissReminder
} from '../../helpers/tasks/reminderAlert.js'

const HOUR = 60 * 60 * 1000

const alertMessage = [
  { label: '24h', ms: 24 * HOUR },
  { label: '1h', ms: HOUR },
  { label: '10min', ms: 10 * 60 * 1000 }
]

// El aviso sobrevive un rato a la hora de la tarea (aún sirve para marcarla
// hecha). Con la alerta más lejana (24h) vive ≤ 25h: dentro del límite de 48h
// que impone Telegram para que un bot borre un mensaje.
const REMINDER_GRACE_MS = HOUR

/**
 * Envía el aviso que toque para una tarea y persiste las alertas ya enviadas.
 * Cada tarea tiene un único aviso vivo: el nuevo sustituye al anterior.
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

      const msg = await safeSendMessage(
        bot,
        task.userId,
        `⌚ <b>Recordatorio (${window.label} antes)</b>:\n<b>${escapeHtml(task.name)}</b>\n` +
          `📅 Programado para el ${formattedDate}`,
        { parse_mode: 'HTML', reply_markup: reminderKeyboard(task._id) }
      )

      // Primero envía y luego retira el anterior: si el envío falla, no se pierde
      const ctx = { telegram: bot.telegram }
      await dismissReminder(ctx, task)
      task.reminderMessageId = msg?.message_id
      scheduleDeletion(
        ctx,
        msg?.message_id,
        diff + REMINDER_GRACE_MS,
        task.userId
      )

      debugLog(`🛎️ ${window.label} → tarea ${task._id}`)
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
