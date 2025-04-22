import { Markup } from 'telegraf'

/**
 * Registra los callbacks para los botones inline de /edit
 * @param {import('telegraf').Telegraf} bot
 */
export function registerEditActions(bot) {
  console.log('[editAction] registerEditActions() llamado')

  // ✔️ Acción “Nombre”
  bot.action('edit_name', async (ctx) => {
    console.log('[editAction] edit_name invocado', {
      callbackData: ctx.callbackQuery?.data,
      sessionBefore: ctx.session
    })
    ctx.session.awaiting = 'new_name'
    return ctx.reply('✔️ Escribe el <b>nuevo nombre</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // 🔸 Acción “Descripción”
  bot.action('edit_desc', async (ctx) => {
    console.log('[editAction] edit_desc invocado', {
      callbackData: ctx.callbackQuery?.data,
      sessionBefore: ctx.session
    })
    ctx.session.awaiting = 'new_desc'
    return ctx.reply('🔸 Escribe la <b>nueva descripción</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // 🔹 Acción “Fecha”
  bot.action('edit_date', async (ctx) => {
    console.log('[editAction] edit_date invocado', {
      callbackData: ctx.callbackQuery?.data,
      sessionBefore: ctx.session
    })
    ctx.session.awaiting = 'new_date'
    return ctx.reply(
      '🔹 Escribe la <b>nueva fecha</b> de la tarea (DD/MM/AAAA [HH:mm] o humanizado):',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.forceReply().reply_markup
      }
    )
  })

  // ✖️ Acción “Cancelar”
  bot.action('edit_cancel', async (ctx) => {
    console.log('[editAction] edit_cancel invocado', {
      callbackData: ctx.callbackQuery?.data,
      sessionBefore: ctx.session
    })
    ctx.session.awaiting = null
    ctx.session.editing = null
    return ctx.reply('✖️ Edición cancelada.')
  })
}
