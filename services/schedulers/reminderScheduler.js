import cron from 'node-cron'
import { Task } from '../../models/task.js'
import { Appointment } from '../../models/appointment.js'
import { STATUS } from '../../helpers/appointments/status.js'
import { bot } from '../../config/telegraf/telegraf.js'
import { safeSendMessage } from '../../utils/retryUtils/safeSendMessage.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import { scheduleDeletion } from '../../utils/telegramUtils/messageLifecycle.js'
import {
  reminderKeyboard,
  appointmentKeyboard,
  dismissReminder
} from '../../helpers/tasks/reminderAlert.js'

const HOUR = 60 * 60 * 1000

const alertMessage = [
  { label: '24h', ms: 24 * HOUR },
  { label: '1h', ms: HOUR },
  { label: '10min', ms: 10 * 60 * 1000 }
]

// El aviso sobrevive un rato a la hora de la tarea o cita (aún sirve para
// marcarla hecha o confirmarla). Con la alerta más lejana (24h) vive ≤ 25h:
// dentro del límite de 48h que impone Telegram para que un bot borre un mensaje.
const REMINDER_GRACE_MS = HOUR

/**
 * Envía el aviso que toque para un elemento con fecha (tarea o cita) y persiste
 * las alertas ya enviadas. Cada elemento tiene un único aviso vivo: el nuevo
 * sustituye al anterior.
 *
 * @param {object} item – tarea o cita (userId, alertsSent, reminderMessageId, save)
 * @param {Date|undefined} dueAt – fecha respecto a la que se cuentan las alertas
 * @param {Date} now
 * @param {(label: string, date: string) => { text: string, reply_markup?: object }} buildMessage
 */
const notifyDue = async (item, dueAt, now, buildMessage) => {
  if (!dueAt) {
    return
  }

  const diff = dueAt.getTime() - now.getTime()
  if (diff < 0) {
    return
  }

  const timezone = await getUserTimezone(item.userId)
  const alerts = item.alertsSent || []

  for (const window of alertMessage) {
    const delta = Math.abs(diff - window.ms)
    if (delta <= 60 * 1000 && !alerts.includes(window.label)) {
      const { text, reply_markup } = buildMessage(
        window.label,
        formatDateEs(dueAt, timezone)
      )

      const msg = await safeSendMessage(bot, item.userId, text, {
        parse_mode: 'HTML',
        reply_markup
      })

      // Primero envía y luego retira el anterior: si el envío falla, no se pierde
      const ctx = { telegram: bot.telegram }
      await dismissReminder(ctx, item)
      item.reminderMessageId = msg?.message_id
      scheduleDeletion(
        ctx,
        msg?.message_id,
        diff + REMINDER_GRACE_MS,
        item.userId
      )

      debugLog(`🛎️ ${window.label} → ${item._id}`)
      alerts.push(window.label)
      break
    }
  }

  item.alertsSent = alerts
  await item.save()
}

const notifyTask = (task, now) =>
  notifyDue(task, task.reminderAt, now, (label, date) => ({
    text:
      `⌚ <b>Recordatorio (${label} antes)</b>:\n<b>${escapeHtml(task.name)}</b>\n` +
      `📅 Programado para el ${date}`,
    reply_markup: reminderKeyboard(task._id)
  }))

const notifyAppointment = (appointment, now) =>
  notifyDue(appointment, appointment.startAt, now, (label, date) => {
    const lines = [
      `📆 <b>Cita (${label} antes)</b>:`,
      `<b>${escapeHtml(appointment.client)}</b>`,
      `🕘 ${date}`
    ]
    if (appointment.location) {
      lines.push(`📍 ${escapeHtml(appointment.location)}`)
    }
    if (appointment.status === STATUS.PENDING) {
      lines.push('⏳ Sin confirmar')
    }
    return {
      text: lines.join('\n'),
      reply_markup: appointmentKeyboard(appointment)
    }
  })

/**
 * Recorre un lote avisando a cada elemento. Un fallo en uno (403 bot
 * bloqueado, usuario huérfano…) no frena al resto ni al otro lote.
 */
const notifyAll = async (find, notify, label, now) => {
  try {
    for (const item of await find()) {
      try {
        await notify(item, now)
      } catch (error) {
        console.error(
          `😵‍💫 Error en el recordatorio de ${label} ${item._id}:`,
          error.message
        )
      }
    }
  } catch (error) {
    console.error('😵‍💫 Error al enviar recordatorios:', error.message)
  }
}

/**
 * Scheduler que revisa cada minuto si hay tareas o citas con alertas por enviar.
 */
export const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    const now = new Date()

    await notifyAll(
      () => Task.find({ completed: false }),
      notifyTask,
      'la tarea',
      now
    )
    await notifyAll(
      () =>
        Appointment.find({
          status: { $ne: STATUS.CANCELLED },
          // Solo las que pueden tener una alerta este minuto (la más lejana es 24h)
          startAt: {
            $gte: now,
            $lte: new Date(now.getTime() + alertMessage[0].ms + 60 * 1000)
          }
        }),
      notifyAppointment,
      'la cita',
      now
    )
  })
}
