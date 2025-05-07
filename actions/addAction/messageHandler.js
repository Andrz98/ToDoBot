import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'

export function registerMessageHandler(bot) {
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, pendingTask } = ctx.session
    if (flowType !== 'add' || !awaiting || !ctx.message?.text) {
      return
    }
    const text = ctx.message.text.trim()
    await ctx.deleteMessage().catch(() => {})

    switch (awaiting) {
      case 'add_name':
        if (!text) {
          return ctx.reply('El nombre es obligatorio.', {
            reply_markup: { force_reply: true }
          })
        }
        pendingTask.name = text
        break

      case 'add_desc':
        pendingTask.description = text
        break

      case 'add_date': {
        // Bloque para la declaración léxica
        const { date } = detectAndParseDate([text], ctx.session.timezone)
        if (!date) {
          return ctx.reply('Fecha inválida.', {
            reply_markup: { force_reply: true }
          })
        }
        pendingTask.reminderAt = date
        break
      }

      default:
        return
    }

    // Guardamos el estado y reiniciamos awaiting
    ctx.session.pendingTask = pendingTask
    ctx.session.awaiting = null

    // Editamos el menú dinámico con los botones pendientes
    const { text: menuText, markup } = buildAddMenu(pendingTask)
    return ctx.editMessageText(menuText, {
      parse_mode: 'Markdown',
      ...markup
    })
  })
}
