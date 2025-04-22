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
    console.log('[forceReply] received message:', ctx.message?.text)
    console.log(
      '[forceReply] awaiting:',
      ctx.session.awaiting,
      ' editing:',
      ctx.session.editing
    )

    const awaiting = ctx.session.awaiting
    const editing = ctx.session.editing
    if (!awaiting || !editing) {
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

      const tz = await getUserTimezone(ctx.from.id)
      const { updated, changes } = updateTaskFields(task, fields, tz)
      if (!updated) {
        return replyMessages.noChanges(ctx)
      }

      await task.save()
      ctx.session.awaiting = null
      ctx.session.editing = null

      return replyMessages.success(ctx, changes)
    } catch (error) {
      console.error('😵‍💫 Error en forceReplyHandler:', error)
      ctx.session.awaiting = null
      ctx.session.editing = null
      return replyMessages.generalError(ctx)
    }
  })
}
