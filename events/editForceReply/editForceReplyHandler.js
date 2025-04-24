import { getUserTimezone } from '../../helpers/timezone/userTimezone/getUserTimezone.js'
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
      // No hay edición en curso
      return
    }

    try {
      // 1) Cargar la tarea
      const task = await Task.findById(editing.id)
      if (!task) {
        ctx.session.awaiting = null
        ctx.session.editing = null
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const text = ctx.message.text.trim()
      const fields = {}
      let newDate

      // 2) Asignar el campo correspondiente
      if (awaiting === 'new_name') {
        fields.newName = text
      } else if (awaiting === 'new_desc') {
        fields.newDescription = text
      } else if (awaiting === 'new_date') {
        // 2.1) Intentar parsear fecha completa
        const parsed = detectAndParseDate([text])
        newDate = parsed.date

        // 2.2) Si sólo envía HH:mm, combinar con la fecha original
        if (!newDate && /^\d{1,2}:\d{2}$/.test(text)) {
          const tz = await getUserTimezone(ctx.from.id)
          const origDT = DateTime.fromJSDate(task.reminderAt, { zone: tz })
          const [h, m] = text.split(':').map((n) => parseInt(n, 10))
          newDate = origDT.set({ hour: h, minute: m }).toJSDate()
        }

        // 2.3) Si sigue sin fecha válida, dejar que reintente
        if (!newDate) {
          return replyMessages.invalidDateFormat(ctx)
        }

        fields.date = newDate
      }

      // 3) Aplicar cambios
      const tz = await getUserTimezone(ctx.from.id)
      const { updated, changes } = updateTaskFields(task, fields, tz)
      if (!updated) {
        ctx.session.awaiting = null
        // Mensaje de “sin cambios”
        await replyMessages.noChanges(ctx)
        // Reenvío del menú
        const { markup } = buildEditMenu(task, tz)
        return ctx.reply(
          'No hubo cambios. Selecciona otro campo o pulsa “Terminar” para salir.',
          { parse_mode: 'HTML', ...markup }
        )
      }

      // 4) Guardar y notificar éxito
      await task.save()
      ctx.session.awaiting = null

      // Mensaje específico de éxito de edición
      const summary = changes.map((c) => ` • ${c}`).join('\n')
      await ctx.reply(`✅ Tarea actualizada correctamente:\n${summary}`, {
        parse_mode: 'HTML'
      })

      // 5) Reenvío del menú sin repetir la descripción completa
      const { markup } = buildEditMenu(task, tz)
      return ctx.reply(
        'Selecciona otro campo para editar o pulsa “Terminar” para concluir.',
        { parse_mode: 'HTML', ...markup }
      )
    } catch (error) {
      console.error('😵‍💫 Error en forceReplyHandler:', error)
      // Cancelar flujo al fallar
      ctx.session.awaiting = null
      ctx.session.editing = null
      return replyMessages.generalError(ctx)
    }
  })
}
