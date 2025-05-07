import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { Markup } from 'telegraf'

export function registerFieldEditActions(bot) {
  bot.action('edit_name', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'new_name'
    return ctx.reply('🔺 Escribe el <b>nuevo nombre</b>:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  bot.action('edit_desc', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'new_desc'
    return ctx.reply('🔸 Escribe la <b>nueva descripción</b>:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  bot.action('edit_date', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'new_date'
    return ctx.reply('🔹 Escribe la <b>nueva fecha</b> (DD/MM/AAAA [HH:mm]):', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })
}
