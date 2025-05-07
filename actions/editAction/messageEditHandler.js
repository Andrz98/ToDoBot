import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'

export function registerMessageEditHandler(bot) {
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, edits, editing, menuMessageId } = ctx.session
    if (flowType !== 'edit' || !awaiting || !ctx.message?.text) {
      return
    }

    // 1) borramos el prompt (reply_to_message) y el mensaje propio
    const replied = ctx.message.reply_to_message
    if (replied?.message_id) {
      await ctx.telegram
        .deleteMessage(ctx.chat.id, replied.message_id)
        .catch(() => {})
    }
    await ctx.deleteMessage().catch(() => {})

    // 2) procesamos la respuesta
    const text = ctx.message.text.trim()
    if (awaiting === 'new_name') {
      edits.name = text
    } else if (awaiting === 'new_desc') {
      edits.description = text
    } else {
      const { date } = detectAndParseDate([text], ctx.session.timezone)
      if (!date) {
        return ctx.reply('Fecha inválida.', {
          reply_markup: { force_reply: true }
        })
      }
      edits.reminderAt = date
    }

    ctx.session.edits = edits
    ctx.session.awaiting = null

    // 3) re-editamos el menú con "Guardar" habilitado
    const task = await import('../../models/task.js').then((m) =>
      m.Task.findById(editing.id)
    )
    const { text: menuText, markup } = buildEditMenu(
      task,
      ctx.session.timezone,
      true,
      edits
    )
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      menuMessageId,
      null,
      menuText,
      { parse_mode: 'HTML', ...markup }
    )
  })
}
