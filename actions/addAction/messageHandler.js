// actions/addAction/messageHandler.js

import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'

export function registerMessageHandler(bot) {
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, pendingTask, menuMessageId } = ctx.session
    if (flowType !== 'add' || !awaiting || !ctx.message?.text) {
      return
    }

    const text = ctx.message.text.trim()
    await ctx.deleteMessage().catch(() => {})

    switch (awaiting) {
      case 'add_name':
        if (!text) {
          return ctx.reply(
            'El nombre es obligatorio. Por favor, intenta de nuevo.',
            { reply_markup: { force_reply: true } }
          )
        }
        pendingTask.name = text
        break

      case 'add_desc':
        pendingTask.description = text
        break

      case 'add_date': {
        const { date } = detectAndParseDate([text], ctx.session.timezone)
        if (!date) {
          return ctx.reply('Fecha inválida. Usa el formato DD/MM/YYYY HH:mm.', {
            reply_markup: { force_reply: true }
          })
        }
        pendingTask.reminderAt = date
        break
      }

      default:
        return
    }

    ctx.session.pendingTask = pendingTask
    ctx.session.awaiting = null

    // Editamos el menú en el mismo mensaje
    const { text: menuText, markup } = buildAddMenu(pendingTask)
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      menuMessageId,
      null,
      menuText,
      { parse_mode: 'Markdown', ...markup }
    )
  })
}
