import { bot } from '../../config/telegraf/telegraf.js'
import { Markup } from 'telegraf'

/**
 *  Acción “✏️ Nombre”
 *  Marca que esperamos el nuevo nombre y fuerza al usuario a responder.
 */

bot.action('edit_name', async (ctx) => {
  ctx.session.awaiting = 'new_name'
  return ctx.reply('✏️ Escribe el <b>nuevo nombre</b> de la tarea:', {
    parse_mode: 'HTML',
    reply_markup: Markup.forceReply().reply_markup
  })
})

/**
 *  Acción “🔸 Descripción”
 */
bot.action('edit_desc', async (ctx) => {
  ctx.session.awaiting = 'new_desc'
  return ctx.reply('🔸Escribe la <b>nueva descripción</b>:', {
    parse_mode: 'HTML',
    reply_markup: Markup.forceReply().reply_markup
  })
})

/**
 *  Acción “🔹 Fecha”
 */
bot.action('edit_date', async (ctx) => {
  ctx.session.awaiting = 'new_date'
  return ctx.reply(
    '✏️ Escribe la <b>nueva fecha</b> (DD/MM/AAAA [HH:mm] o estilo humanizado):',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    }
  )
})

/**
 *  Acción “✖️ Cancelar”
 *  Limpia la sesión y confirma cancelación.
 */
bot.action('edit_cancel', async (ctx) => {
  ctx.session.awaiting = null
  ctx.session.editing = null
  return ctx.reply('✖️ Edición cancelada.')
})
