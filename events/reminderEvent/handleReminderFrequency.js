import { Markup } from 'telegraf'
import { findTask } from '../../helpers/tasks/findTask.js'
import { buildFrequencyMenu } from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { GENERAL_ERROR_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { renderInterface } from '../../utils/telegramUtils/flowMessages.js'

/** /reminder, paso 2: botonera de periodicidad sobre el mismo mensaje. */
export const handleReminderFrequency = async (ctx) => {
  try {
    const [, taskId] = ctx.callbackQuery.data.split('::')

    const task = await findTask(ctx.from.id, { id: taskId })
    if (!task) {
      return safeAnswerCbQuery(ctx, 'Tarea no encontrada.', { show_alert: true })
    }

    ctx.session.flowType = 'reminder'
    const { text, markup } = buildFrequencyMenu(
      (value) => `saveReminder::${taskId}::${value}`,
      task.frequency,
      [[Markup.button.callback('✖️ Cancelar', 'reminder_cancel')]]
    )

    await safeAnswerCbQuery(ctx)
    return renderInterface(ctx, `<b>${escapeHtml(task.name)}</b>\n\n${text}`, {
      parse_mode: 'HTML',
      ...markup
    })
  } catch (error) {
    console.error('❌ Error en handleReminderFrequency:', error)
    ctx.session.flowType = null
    return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
  }
}
