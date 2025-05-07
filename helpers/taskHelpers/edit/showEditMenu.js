import { buildEditMenu } from './interactiveFlowEdit.js'
export async function showEditMenu(ctx, first = false) {
  const { text, markup } = buildEditMenu(/*…*/)

  if (first) {
    const msg = await ctx.reply(text, markup)
    ctx.session.menuMessageId = msg.message_id
  } else {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.menuMessageId,
        null,
        text,
        { parse_mode: 'HTML', ...markup }
      )
    } catch {
      const msg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = msg.message_id
    }
  }
}
