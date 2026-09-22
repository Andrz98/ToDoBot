import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { safeDeleteMessage } from '../../utils/telegramUtils/safeDeleteMessage.js'

export function registerMessageHandler(bot) {
  bot.on('message', async (ctx, next) => {
    const { flowType, awaiting, pendingTask, menuMessageId } = ctx.session
    if (flowType !== 'add' || !awaiting || !ctx.message?.text) {
      return typeof next === 'function' ? next() : undefined
    }

    const text = ctx.message.text.trim()
    const timezone = await getUserTimezone(ctx.from.id)

    // 1. Si es respuesta a un force-reply, borramos el prompt original
    const replied = ctx.message.reply_to_message
    if (replied?.message_id) {
      await safeDeleteMessage(ctx, ctx.chat.id, replied.message_id)
    }
    // 2. Borramos la respuesta del usuario
    await safeDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id)

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
        const { date } = detectAndParseDate([text], timezone)
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
    const { text: menuText, markup } = buildAddMenu(pendingTask, timezone)
    const targetId = menuMessageId

    if (!targetId) {
      const newMsg = await ctx.reply(menuText, markup)
      ctx.session.menuMessageId = newMsg.message_id
      return
    }

    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        targetId,
        null,
        menuText,
        markup
      )
    } catch {
      const newMsg = await ctx.reply(menuText, markup)
      ctx.session.menuMessageId = newMsg.message_id
    }
  })
}
