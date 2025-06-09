import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { Task } from '../../models/task.js'
import { updateTaskFields } from '../../helpers/tasks/common/updateTaskFields.js'
import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
import { DateTime } from 'luxon'
import { debugLog } from '../../utils/logUtils/debugLog.js'

/**
 * Maneja las respuestas forzadas tras pulsar un botón de edición.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerForceReplyHandler(bot) {
  bot.on('message', async (ctx, next) => {
    debugLog(
      '📥 [editForceReplyHandler] Recibido mensaje:',
      ctx.message?.text
    )

    // 🔒 Evitar interceptar comandos
    if (ctx.message?.text?.startsWith('/')) {
      debugLog(
        '⛔️ [editForceReplyHandler] Ignorando comando:',
        ctx.message.text
      )
      return typeof next === 'function' ? next() : undefined
    }

    // 🔁 Ignorar si no hay flujo activo
    if (!ctx.session || !ctx.session.awaiting || !ctx.session.editing) {
      debugLog(
        '🔁 [editForceReplyHandler] No hay flujo activo. Liberando flujo.'
      )
      return typeof next === 'function' ? next() : undefined
    }

    const { awaiting, editing, edits = {} } = ctx.session

    try {
      const task = await Task.findById(editing.id)
      if (!task) {
        ctx.session = {}
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const text = ctx.message.text.trim()
      const fields = {}
      let newDate

      if (awaiting === 'new_name') {
        fields.newName = text
      } else if (awaiting === 'new_desc') {
        fields.newDescription = text
      } else if (awaiting === 'new_date') {
        const parsed = detectAndParseDate([text])
        newDate = parsed.date

        if (!newDate && /^\d{1,2}:\d{2}$/.test(text)) {
          const tz = await getUserTimezone(ctx.from.id)
          const origDT = DateTime.fromJSDate(task.reminderAt, { zone: tz })
          const [h, m] = text.split(':').map((n) => parseInt(n, 10))
          newDate = origDT.set({ hour: h, minute: m }).toJSDate()
        }

        if (!newDate) {
          return replyMessages.invalidDateFormat(ctx)
        }

        fields.date = newDate
      }

      const tz = await getUserTimezone(ctx.from.id)
      const { updated, changes } = updateTaskFields(task, fields, tz)
      ctx.session.awaiting = null

      if (!updated) {
        const hasEdits = Object.keys(edits).length > 0
        const { markup } = buildEditMenu(task, tz, hasEdits)
        return await ctx.reply(
          'No hubo cambios. Selecciona otro campo o pulsa "Guardar" para finalizar.',
          { parse_mode: 'HTML', ...markup }
        )
      }

      ctx.session.edits = { ...edits, ...fields }
      const summary = changes.join('\n')

      await ctx.reply(`Cambio aplicado:\n${summary}`, { parse_mode: 'HTML' })

      const { markup } = buildEditMenu(task, tz, true)
      return await ctx.reply(
        'Selecciona otro campo o pulsa "Guardar" para finalizar.',
        { parse_mode: 'HTML', ...markup }
      )
    } catch (error) {
      console.error('❌ Error en forceReplyHandler:', error)
      ctx.session.awaiting = null
      ctx.session.editing = null
      ctx.session.flowType = null
      ctx.session.edits = null
      return replyMessages.generalError(ctx)
    }
  })
}
