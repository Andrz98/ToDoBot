import { Markup } from 'telegraf'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlowEdit.js'
import { getUserTimezone } from '../../helpers/timezone/userTimezone/getUserTimezone.js'

/**
 * Registra los callbacks para los botones inline de /edit
 * Solo maneja el flujo interactivo de edición de tareas.
 */
export function registerEditActions(bot) {
  // Cambiar nombre
  bot.action('edit_name', async (ctx) => {
    await ctx.answerCbQuery()
    ctx.session.awaiting = 'new_name'
    return ctx.reply('🔺Escribe el <b>nuevo nombre</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // Cambiar descripción
  bot.action('edit_desc', async (ctx) => {
    await ctx.answerCbQuery()
    ctx.session.awaiting = 'new_desc'
    return ctx.reply('🔸 Escribe la <b>nueva descripción</b> de la tarea:', {
      parse_mode: 'HTML',
      reply_markup: Markup.forceReply().reply_markup
    })
  })

  // Cambiar fecha
  bot.action('edit_date', async (ctx) => {
    await ctx.answerCbQuery()
    ctx.session.awaiting = 'new_date'
    return ctx.reply(
      '🔹 Escribe la <b>nueva fecha</b> de la tarea (DD/MM/AAAA [HH:mm]):',
      { parse_mode: 'HTML', reply_markup: Markup.forceReply().reply_markup }
    )
  })

  // Cancelar edición
  bot.action('edit_cancel', async (ctx) => {
    await ctx.answerCbQuery()
    ctx.session.awaiting = null
    ctx.session.editing = null
    return ctx.reply('✖️ Edición cancelada.')
  })

  // Seleccionar tarea e iniciar flujo interactivo
  registerTaskSelector(bot, 'select_edit', async (ctx, task) => {
    await ctx.answerCbQuery()
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.awaiting = null
    const tz = await getUserTimezone(ctx.from.id)
    const { text, markup } = buildEditMenu(task, tz)
    return ctx.reply(text, { parse_mode: 'HTML', ...markup })
  })
}
