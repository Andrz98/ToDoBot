import { Task } from '../../models/task.js'
import { Appointment } from '../../models/appointment.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { SNOOZE } from '../../helpers/tasks/reminderAlert.js'
import { STATUS } from '../../helpers/appointments/status.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { deleteNow } from '../../utils/telegramUtils/messageLifecycle.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

const NOT_FOUND_TEXT = 'Tarea no encontrada.'

/**
 * Botones del aviso de recordatorio (lo envía reminderScheduler). El resultado
 * llega como aviso emergente y el aviso desaparece: no queda ningún mensaje
 * nuevo en el chat. Si algo falla, el aviso se conserva para reintentar.
 */
const onAlert = (handler) => async (ctx) => {
  if (!(await isUserAuthorized(ctx))) {
    return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
  }
  try {
    await safeAnswerCbQuery(ctx, await handler(ctx))
  } catch (error) {
    console.error('❌ Error en el aviso de recordatorio:', error)
    return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
  }
  return deleteNow(ctx, ctx.callbackQuery?.message?.message_id, ctx.from.id)
}

export function registerAlertActions(bot) {
  bot.action(
    /^rem_done::([a-f\d]{24})$/,
    onAlert(async (ctx) => {
      const task = await Task.findOneAndUpdate(
        { _id: ctx.match[1], userId: ctx.from.id },
        { completed: true }
      )
      return task ? '✅ Tarea completada.' : NOT_FOUND_TEXT
    })
  )

  bot.action(
    /^rem_aptok::([a-f\d]{24})$/,
    onAlert(async (ctx) => {
      // Una cita cancelada no se puede "resucitar" con un botón viejo
      const appointment = await Appointment.findOneAndUpdate(
        {
          _id: ctx.match[1],
          userId: ctx.from.id,
          status: { $ne: STATUS.CANCELLED }
        },
        { status: STATUS.CONFIRMED, gcalDirty: true }
      )
      return appointment ? '✅ Cita confirmada.' : 'Cita no encontrada.'
    })
  )

  bot.action(
    /^rem_snooze::([a-f\d]{24})::(1h|1d)$/,
    onAlert(async (ctx) => {
      const task = await findTask(ctx.from.id, { id: ctx.match[1] })
      if (!task) {
        return NOT_FOUND_TEXT
      }

      // Desde la fecha de la tarea, o desde ahora si ya pasó
      const from = Math.max(task.reminderAt?.getTime() ?? 0, Date.now())
      task.reminderAt = new Date(from + SNOOZE[ctx.match[2]].ms)
      task.alertsSent = []
      task.reminderMessageId = undefined
      await task.save()

      const timezone = await getUserTimezone(ctx.from.id)
      return `⏰ Aplazada al ${formatDateEs(task.reminderAt, timezone)}`
    })
  )
}
