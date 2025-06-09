import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { updateTaskFields } from '../../helpers/tasks/common/updateTaskFields.js'
import { Task } from '../../models/task.js'

export function registerSaveEditAction(bot) {
  bot.action('edit_save', async (ctx) => {
    await safeEditMessageReplyMarkup(ctx)

    const { editing, edits } = ctx.session
    const task = await Task.findById(editing.id)

    const { updated } = updateTaskFields(task, edits, ctx.session.timezone)
    let cbText
    if (updated) {
      await task.save()
      cbText = '👌🏽 Tarea editada'
      flashReply(ctx, cbText)
    } else {
      cbText = 'ℹ️ No hubo cambios.'
      flashReply(ctx, cbText, { parse_mode: 'HTML' })
    }
    await safeAnswerCbQuery(ctx, cbText)

    // Elimino el mensaje original solo si existe
    if (ctx.callbackQuery?.message) {
      await ctx.deleteMessage().catch(() => {})
    }

    // limpiamos todo
    delete ctx.session.flowType
    delete ctx.session.editing
    delete ctx.session.edits
    delete ctx.session.awaiting
    delete ctx.session.menuMessageId
  })
}
