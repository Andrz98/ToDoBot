import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { updateTaskFields } from '../../helpers/taskHelpers/edit/updateTaskFields.js'
import { Task } from '../../models/task.js'

export function registerSaveEditAction(bot) {
  bot.action('edit_save', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    const { editing, edits } = ctx.session
    const task = await Task.findById(editing.id)

    const { updated, changes } = updateTaskFields(
      task,
      edits,
      ctx.session.timezone
    )
    if (updated) {
      await task.save()
      await delayReply(
        ctx,
        `👌🏽 Tarea guardada:\n${changes.join('\n')}`,
        { parse_mode: 'HTML' }
      )
    } else {
      await delayReply(ctx, 'ℹ️ No hubo cambios.', { parse_mode: 'HTML' })
    }

    // limpiamos todo
    delete ctx.session.flowType
    delete ctx.session.editing
    delete ctx.session.edits
    delete ctx.session.awaiting
    delete ctx.session.menuMessageId
  })
}
