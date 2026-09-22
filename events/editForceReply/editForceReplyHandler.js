import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { Task } from '../../models/task.js'
import { updateTaskFields } from '../../helpers/taskHelpers/edit/updateTaskFields.js'
import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
import { safeDeleteMessage } from '../../utils/telegramUtils/safeDeleteMessage.js'
import { DateTime } from 'luxon'
import { debugLog } from '../../utils/logUtils/debugLog.js'

/**
 * Maneja las respuestas forzadas tras pulsar un botón de edición.
 * Edita el mensaje del menú en sitio en vez de acumular mensajes nuevos
 * (mismo estándar que actions/addAction/messageHandler.js para /add).
 * @param {import('telegraf').Telegraf} bot
 */
export function registerForceReplyHandler(bot) {
  bot.on('message', async (ctx, next) => {
    debugLog('📥 [editForceReplyHandler] Recibido mensaje')

    // 🔒 Evitar interceptar comandos
    if (ctx.message?.text?.startsWith('/')) {
      debugLog('⛔️ [editForceReplyHandler] Ignorando comando')
      return typeof next === 'function' ? next() : undefined
    }

    // 🔁 Ignorar si no hay flujo activo
    if (!ctx.session || !ctx.session.awaiting || !ctx.session.editing) {
      debugLog(
        '🔁 [editForceReplyHandler] No hay flujo activo. Liberando flujo.'
      )
      return typeof next === 'function' ? next() : undefined
    }

    const { awaiting, editing, edits = {}, menuMessageId } = ctx.session

    // Borramos el prompt de force-reply y la respuesta del usuario:
    // el resultado se refleja editando el menú, no acumulando mensajes
    const replied = ctx.message.reply_to_message
    if (replied?.message_id) {
      await safeDeleteMessage(ctx, ctx.chat.id, replied.message_id)
    }
    await safeDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id)

    try {
      const task = await Task.findById(editing.id)
      if (!task) {
        ctx.session = {}
        return replyMessages.taskNotFound(ctx, editing.oldName)
      }

      const text = ctx.message.text.trim()
      const tz = await getUserTimezone(ctx.from.id)
      const fields = {}
      let newDate

      if (awaiting === 'new_name') {
        fields.newName = text
      } else if (awaiting === 'new_desc') {
        fields.newDescription = text
      } else if (awaiting === 'new_date') {
        const parsed = detectAndParseDate([text], tz)
        newDate = parsed.date

        if (!newDate && /^\d{1,2}:\d{2}$/.test(text)) {
          const origDT = DateTime.fromJSDate(task.reminderAt, { zone: tz })
          const [h, m] = text.split(':').map((n) => parseInt(n, 10))
          newDate = origDT.set({ hour: h, minute: m }).toJSDate()
        }

        if (!newDate) {
          return replyMessages.invalidDateFormat(ctx)
        }

        fields.date = newDate
      }

      const { updated, changes } = updateTaskFields(task, fields, tz)
      ctx.session.awaiting = null

      let banner
      let hasEdits
      if (updated) {
        ctx.session.edits = { ...edits, ...fields }
        hasEdits = true
        banner = `Cambio aplicado:\n${changes.join('\n')}`
      } else {
        hasEdits = Object.keys(edits).length > 0
        banner = 'ℹ️ No hubo cambios.'
      }

      const { text: fieldSummary, markup } = buildEditMenu(task, tz, hasEdits)
      const finalText =
        `${banner}\n\n${fieldSummary}\n\n` +
        'Selecciona otro campo o pulsa "Guardar" para finalizar.'
      const extra = { parse_mode: 'HTML', ...markup }

      const targetId = menuMessageId ?? ctx.callbackQuery?.message?.message_id
      if (!targetId) {
        const newMsg = await ctx.reply(finalText, extra)
        ctx.session.menuMessageId = newMsg.message_id
        return
      }

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          targetId,
          null,
          finalText,
          extra
        )
      } catch {
        const newMsg = await ctx.reply(finalText, extra)
        ctx.session.menuMessageId = newMsg.message_id
      }
    } catch (error) {
      if (error.message === 'PAST_DATE') {
        return replyMessages.pastDate(ctx)
      }
      console.error('❌ Error en forceReplyHandler:', error)
      ctx.session.awaiting = null
      ctx.session.editing = null
      ctx.session.flowType = null
      ctx.session.edits = null
      ctx.session.menuMessageId = null
      return replyMessages.generalError(ctx)
    }
  })
}
