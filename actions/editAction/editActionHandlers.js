import { Markup } from 'telegraf'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlowEdit.js'
import { getUserTimezone } from '../../helpers/timezone/userTimezone/getUserTimezone.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'
import { Task } from '../../models/task.js'

/**
 * Registra los callbacks para los botones inline de /edit
 * Solo maneja el flujo interactivo de edición de tareas.
 */
export function registerEditActions(bot) {
  // Cambiar nombre
  bot.action('edit_name', async (ctx) => {
    await ctx.answerCbQuery()
    ctx.session.awaiting = 'new_name'
    return ctx.reply('🔺 Escribe el <b>nuevo nombre</b> de la tarea:', {
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

  // Guardar edición
  bot.action('edit_save', async (ctx) => {
    await ctx.answerCbQuery()

    const session = ctx.session
    if (!session.editing) {
      // Nada que guardar
      return ctx.reply('No hay edición activa.', { parse_mode: 'HTML' })
    }

    // Cargo la tarea
    const task = await Task.findById(session.editing.id)
    if (!task) {
      // Si faltara algo, limpio todo el flujo
      session.flowType = null
      session.editing = null
      session.edits = null
      session.awaiting = null
      session.timezone = null
      return ctx.reply('Error: no se pudo encontrar la tarea.', {
        parse_mode: 'HTML'
      })
    }

    // Aplico los cambios acumulados
    const tz = session.timezone
    const { updated, changes } = updateTaskFields(task, session.edits, tz)

    if (updated) {
      await task.save()
      const summary = changes.map((c) => ` • ${c}`).join('\n')
      await ctx.reply(`Tarea guardada:\n${summary}`, { parse_mode: 'HTML' })
    } else {
      await ctx.reply('No hubo cambios que guardar.', { parse_mode: 'HTML' })
    }

    // Limpio completamente el flujo de edición
    session.flowType = null
    session.editing = null
    session.edits = null
    session.awaiting = null
    session.timezone = null
  })

  // Seleccionar tarea e iniciar flujo de edición
  registerTaskSelector(bot, 'select_edit', async (ctx, task) => {
    await ctx.answerCbQuery()

    // Inicio del flujo
    ctx.session.flowType = 'edit'
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.awaiting = null
    ctx.session.edits = {}

    // Guardamos la zona horaria
    const tz = await getUserTimezone(ctx.from.id)
    ctx.session.timezone = tz

    // Muestro menú inicial sin botón "Guardar"
    const { text, markup } = buildEditMenu(task, tz, false)
    return ctx.reply(text, { parse_mode: 'HTML', ...markup })
  })
}
