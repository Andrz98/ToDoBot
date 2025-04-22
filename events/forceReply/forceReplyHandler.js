import { getUserTimezone } from '../../helpers/userTimezone/getUserTimezone.js'
import { Task } from '../../models/task.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'
import { detectAndParseDate } from '../../helpers/date/detectAndParseDate.js'
import { replyMessages } from '../../helpers/replyMessages/replyMessages.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlow.js'

/**
 * Maneja las respuestas forzadas tras pulsar un botón de edición.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerForceReplyHandler(bot) {
  bot.on('message', async (ctx) => {
    const { awaiting, editing } = ctx.session
    if (!awaiting || !editing) {
      // No estamos en un flujo de edición activo
      return
    }

    try {
      // Volvemos a cargar la tarea por su id
      const task = await Task.findById(editing.id)
      if (!task) {
        // Si la tarea ya no existe, cancelamos todo
        ctx.session.awaiting = null
        ctx.session.editing = null
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const text = ctx.message.text.trim()
      const fields = {}

      // Asignamos el campo correspondiente según awaiting
      if (awaiting === 'new_name') {
        fields.newName = text
      } else if (awaiting === 'new_desc') {
        fields.newDescription = text
      } else if (awaiting === 'new_date') {
        const { date } = detectAndParseDate([text])
        if (!date) {
          return replyMessages.invalidDateFormat(ctx)
        }
        fields.date = date
      }

      // Actualizamos la tarea en memoria
      const tz = await getUserTimezone(ctx.from.id)
      const { updated, changes } = updateTaskFields(task, fields, tz)
      if (!updated) {
        // Sin cambios, limpiamos awaiting y volvemos al menú
        ctx.session.awaiting = null
        await replyMessages.noChanges(ctx)
        const { text: menuText, markup } = buildEditMenu(task, tz)
        return ctx.reply(menuText, { parse_mode: 'HTML', ...markup })
      }

      // Persistimos los cambios en BD
      await task.save()

      // Limpiamos solo awaiting, mantenemos editing
      ctx.session.awaiting = null

      // Informamos del éxito y mostramos de nuevo el menú
      await replyMessages.success(ctx, changes)
      const { text: menuText, markup } = buildEditMenu(task, tz)
      return ctx.reply(menuText, { parse_mode: 'HTML', ...markup })
    } catch (error) {
      console.error('😵‍💫 Error en forceReplyHandler:', error)
      // Error grave: cancelamos todo el flujo
      ctx.session.awaiting = null
      ctx.session.editing = null
      return replyMessages.generalError(ctx)
    }
  })
}
