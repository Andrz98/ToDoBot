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
      // Cargamos la tarea
      const task = await Task.findById(editing.id)
      if (!task) {
        ctx.session.awaiting = null
        ctx.session.editing = null
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const text = ctx.message.text.trim()
      const fields = {}

      // Asignar el campo correspondiente
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

      // Aplicar cambios
      const tz = await getUserTimezone(ctx.from.id)
      const { updated, changes } = updateTaskFields(task, fields, tz)
      if (!updated) {
        ctx.session.awaiting = null
        await replyMessages.noChanges(ctx)
        // Solo reenvío el teclado, SIN volver a mostrar la tarea
        const { markup } = buildEditMenu(task, tz)
        return ctx.reply(
          'No hubo cambios. Selecciona otro campo o pulsa ✖️ para cancelar.',
          { parse_mode: 'HTML', ...markup }
        )
      }

      // Guardar y limpiar awaiting, conservar editing
      await task.save()
      ctx.session.awaiting = null

      // Informar éxito
      await replyMessages.success(ctx, changes)

      // Solo reenvío el teclado, sin repetir la descripción completa
      const { markup } = buildEditMenu(task, tz)
      return ctx.reply(
        'Selecciona otro campo para editar o pulsa ✖️ para terminar.',
        { parse_mode: 'HTML', ...markup }
      )
    } catch (error) {
      console.error('😵‍💫 Error en forceReplyHandler:', error)
      // Al fallar, cancelamos todo el flujo
      ctx.session.awaiting = null
      ctx.session.editing = null
      return replyMessages.generalError(ctx)
    }
  })
}
