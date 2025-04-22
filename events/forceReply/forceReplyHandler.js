import { getUserTimezone } from '../../helpers/userTimezone/getUserTimezone.js'
import { Task } from '../../models/task.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'
import { detectAndParseDate } from '../../helpers/date/detectAndParseDate.js'
import { replyMessages } from '../../helpers/replyMessages/replyMessages.js'

/**
 * Maneja las respuestas forzadas tras pulsar un botón de edición.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerForceReplyHandler(bot) {
  bot.on('message', async (ctx) => {
    console.log('[forceReply] Mensaje recibido:', ctx.message?.text)
    console.log(
      '[forceReply] session:',
      'awaiting=',
      ctx.session.awaiting,
      'editing=',
      ctx.session.editing
    )

    const { awaiting, editing } = ctx.session
    if (!awaiting || !editing) {
      console.log('[forceReply] No hay flujo activo, saliendo')
      return
    }

    try {
      const task = await Task.findById(editing.id)
      if (!task) {
        ctx.session.awaiting = null
        ctx.session.editing = null
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const text = ctx.message.text.trim()
      const fields = {}

      if (awaiting === 'new_name') {
        console.log('[forceReply] Procesando new_name:', text)
        fields.newName = text
      } else if (awaiting === 'new_desc') {
        console.log('[forceReply] Procesando new_desc:', text)
        fields.newDescription = text
      } else if (awaiting === 'new_date') {
        console.log('[forceReply] Procesando new_date:', text)
        const { date } = detectAndParseDate([text])
        if (!date) {
          return replyMessages.invalidDateFormat(ctx)
        }
        fields.date = date
      }

      const tz = await getUserTimezone(ctx.from.id)
      const { updated, changes } = updateTaskFields(task, fields, tz)
      if (!updated) {
        return replyMessages.noChanges(ctx)
      }

      await task.save()
      ctx.session.awaiting = null
      ctx.session.editing = null

      console.log('[forceReply] Edición aplicada, cambios:', changes)
      return replyMessages.success(ctx, changes)
    } catch (error) {
      console.error('😵‍💫 Error en forceReplyHandler:', error)
      ctx.session.awaiting = null
      ctx.session.editing = null
      return replyMessages.generalError(ctx)
    }
  })
}
