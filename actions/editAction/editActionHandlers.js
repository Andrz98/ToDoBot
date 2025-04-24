import { Markup } from 'telegraf'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlowEdit.js'
import { getUserTimezone } from '../../helpers/userTimezone/getUserTimezone.js'

/**
 * Registra los callbacks para los botones inline de /edit
 * @param {import('telegraf').Telegraf} bot
 */
export function registerEditActions(bot) {
  // ✔️ Nombre
  bot.action('edit_name', async (ctx) => {
    await ctx.answerCbQuery() // 1) Acknowledge
    console.log('[editAction] edit_name invocado', ctx.session)
    ctx.session.awaiting = 'new_name'
    // await ctx.editMessageReplyMarkup()   // opcional: quita el inline keyboard
    return ctx.reply('✔️ Escribe el <b>nuevo nombre</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // 🔸 Descripción
  bot.action('edit_desc', async (ctx) => {
    await ctx.answerCbQuery()
    console.log('[editAction] edit_desc invocado', ctx.session)
    ctx.session.awaiting = 'new_desc'
    // await ctx.editMessageReplyMarkup()
    return ctx.reply('🔸 Escribe la <b>nueva descripción</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // 🔹 Fecha
  bot.action('edit_date', async (ctx) => {
    await ctx.answerCbQuery()
    console.log('[editAction] edit_date invocado', ctx.session)
    ctx.session.awaiting = 'new_date'
    // await ctx.editMessageReplyMarkup()
    return ctx.reply(
      '🔹 Escribe la <b>nueva fecha</b> de la tarea (DD/MM/AAAA [HH:mm]):', // 2) Paréntesis corregido
      {
        parse_mode: 'HTML',
        reply_markup: Markup.forceReply().reply_markup
      }
    )
  })

  // ✖️ Cancelar
  bot.action('edit_cancel', async (ctx) => {
    await ctx.answerCbQuery()
    console.log('[editAction] edit_cancel invocado', ctx.session)
    ctx.session.awaiting = null
    ctx.session.editing = null
    return ctx.reply('✖️ Edición cancelada.')
  })

  // • Seleccionar tarea para editar (modular)
  registerTaskSelector(bot, 'select_edit', async (ctx, task) => {
    await ctx.answerCbQuery()
    console.log('[editAction] select_edit invocado', {
      callbackData: ctx.callbackQuery.data,
      sessionBefore: ctx.session
    })

    // iniciar flujo interactivo con la tarea seleccionada
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.awaiting = null

    // mostrar menú inline de edición
    const tz = await getUserTimezone(ctx.from.id)
    const { text, markup } = buildEditMenu(task, tz)
    return ctx.reply(text, { parse_mode: 'HTML', ...markup })
  })
}
