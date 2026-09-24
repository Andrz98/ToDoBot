import { findTask } from '../../helpers/tasks/findTask.js'
import { dismissReminder } from '../../helpers/tasks/reminderAlert.js'
import { closeInterface } from '../../utils/telegramUtils/flowMessages.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { frequencyLabels } from '../../helpers/frequency/frequencyLabels.js'
import { isValidFrequency } from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { formatDateEs } from '../../helpers/taskHelpers/date/formatDateEs.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { GENERAL_ERROR_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'

const addIntervalToNow = (frequency) => {
  const now = new Date()
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1)
      break
  }
  return now
}

export const saveReminderAction = async (ctx) => {
  const callbackData = ctx.callbackQuery.data
  const [, taskId, frequency] = callbackData.split('::')
  if (!isValidFrequency(frequency)) {
    return ctx.answerCbQuery('Periodicidad no válida.', { show_alert: true })
  }

  const task = await findTask(ctx.from.id, { id: taskId })
  if (!task) {
    return ctx.answerCbQuery('Tarea no encontrada.')
  }

  try {
    task.frequency = frequency
    task.reminderAt = addIntervalToNow(frequency)
    task.alertsSent = [] // Resetea las alertas pasadas
    await dismissReminder(ctx, task) // El aviso vivo habla de la fecha anterior

    await task.save()
    await ctx.answerCbQuery()
    ctx.session.flowType = null

    // Sustituye el teclado de frecuencia por el resultado: ya no debe quedar
    // pulsable (re-ejecutaría el guardado con otra frecuencia)
    const timezone = await getUserTimezone(ctx.from.id).catch(() => undefined)
    return closeInterface(
      ctx,
      `🔔 Recordatorio de <b>${escapeHtml(task.name)}</b>: ${frequencyLabels[frequency]}.
` +
        `Próximo aviso: ${formatDateEs(task.reminderAt, timezone)}`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('❌ Error en saveReminderAction:', error)
    ctx.session.flowType = null
    delete ctx.session.menuMessageId
    return ctx.answerCbQuery(GENERAL_ERROR_TEXT, { show_alert: true })
  }
}
