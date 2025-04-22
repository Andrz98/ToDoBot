import { Markup } from 'telegraf'

/**
 * Registra los callbacks para los botones inline de /edit
 * @param {import('telegraf').Telegraf} bot
 */
export function registerEditActions(bot) {
  // ✔️ Acción “Nombre”
  bot.action('edit_name', async (ctx) => {
    console.log(
      '[editAction] edit_name fired → callbackQuery.data:',
      ctx.callbackQuery?.data
    )
    console.log('[editAction] session before:', ctx.session)
    ctx.session.awaiting = 'new_name'
    return ctx.reply('✔️ Escribe el <b>nuevo nombre</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // 🔸 Acción “Descripción”
  bot.action('edit_desc', async (ctx) => {
    console.log(
      '[editAction] edit_desc fired → callbackQuery.data:',
      ctx.callbackQuery?.data
    )
    console.log('[editAction] session before:', ctx.session)
    ctx.session.awaiting = 'new_desc'
    return ctx.reply('🔸 Escribe la <b>nueva descripción</b>:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // 🔹 Acción “Fecha”
  bot.action('edit_date', async (ctx) => {
    console.log(
      '[editAction] edit_date fired → callbackQuery.data:',
      ctx.callbackQuery?.data
    )
    console.log('[editAction] session before:', ctx.session)
    ctx.session.awaiting = 'new_date'
    return ctx.reply(
      '🔹 Escribe la <b>nueva fecha</b> (DD/MM/AAAA [HH:mm] o humanizado):',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.forceReply().reply_markup
      }
    )
  })

  // ✖️ Acción “Cancelar”
  bot.action('edit_cancel', async (ctx) => {
    ctx.session.awaiting = null
    ctx.session.editing = null
    return ctx.reply('✖️ Edición cancelada.')
  })
}
