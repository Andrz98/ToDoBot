import { getUserTimezone } from '../../helpers/userTimezone/getUserTimezone.js'
import { Task } from '../../models/task.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'
import { detectAndParseDate } from '../../helpers/date/detectAndParseDate.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlowEdit.js'
import { DateTime } from 'luxon'

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
      let newDate

      // Asignar el campo correspondiente
      if (awaiting === 'new_name') {
        fields.newName = text
      } else if (awaiting === 'new_desc') {
        fields.newDescription = text
      } else if (awaiting === 'new_date') {
        // 1) Intento parsear fecha completa
        const parsed = detectAndParseDate([text])
        newDate = parsed.date

        // 2) Si envía solo HH:mm, lo combino con la fecha original
        if (!newDate && /^\d{1,2}:\d{2}$/.test(text)) {
          const tz = await getUserTimezone(ctx.from.id)
          const origDT = DateTime.fromJSDate(task.reminderAt, { zone: tz })
          const [h, m] = text.split(':').map((n) => parseInt(n, 10))
          newDate = origDT.set({ hour: h, minute: m }).toJSDate()
        }

        // 3) Si aún no hay fecha válida, mantengo el estado para reintento
        if (!newDate) {
          return replyMessages.invalidDateFormat(ctx)
        }

        fields.date = newDate
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
