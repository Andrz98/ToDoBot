import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { showEditMenu } from '../../helpers/taskHelpers/edit/showEditMenu.js'

export function registerMessageEditHandler(bot) {
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, edits } = ctx.session
    if (flowType !== 'edit' || !awaiting || !ctx.message?.text) {
      return
    }

    const text = ctx.message.text.trim()
    await ctx.deleteMessage().catch(() => {})

    switch (awaiting) {
      case 'new_name':
        edits.name = text
        break

      case 'new_desc':
        edits.description = text
        break

      case 'new_date': {
        const { date } = detectAndParseDate([text], ctx.session.timezone)
        if (!date) {
          return ctx.reply('Fecha inválida. Usa DD/MM/YYYY HH:mm.', {
            reply_markup: { force_reply: true }
          })
        }
        edits.reminderAt = date
        break
      }

      default:
        return
    }

    // vuelco edits y limpio awaiting
    ctx.session.edits = edits
    ctx.session.awaiting = null

    // re-renderiza el menú en el mismo mensaje con los cambios
    return showEditMenu(ctx)
  })
}
