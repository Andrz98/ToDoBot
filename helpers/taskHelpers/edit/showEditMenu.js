import { buildEditMenu } from './interactiveFlowEdit.js'
import { Task } from '../../../models/task.js'

/**
 * Envía o edita el menú dinámico de edición según ctx.session.editing y ctx.session.edits
 *
 * @param {import('telegraf').Context} ctx
 * @param {boolean} first  – si es la primera llamada usa ctx.reply(), si no usa editMessageText()
 */
export async function showEditMenu(ctx, first = false) {
  // 1) Carga tarea original
  const task = await Task.findById(ctx.session.editing.id)
  // 2) Recoge edits
  const edits = ctx.session.edits
  const tz = ctx.session.timezone

  // 3) Construye menú (siempre con botón "Guardar cambios")
  const { text, markup } = buildEditMenu(task, tz, true, edits)

  if (first) {
    const msg = await ctx.reply(text, markup)
    ctx.session.menuMessageId = msg.message_id
  } else {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.menuMessageId,
        null,
        text,
        { parse_mode: 'HTML', ...markup }
      )
    } catch {
      const msg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = msg.message_id
    }
  }
}
