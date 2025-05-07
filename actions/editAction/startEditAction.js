import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'

/**
 * Arranca el flujo /edit:
 *  - Muestra selector de tareas
 *  - Al elegir, inicializa sesión y edita el menú de edición
 */
export function registerStartEditAction(bot) {
  // 1) Comando /edit: despliega la lista de tareas
  bot.command('edit', isAuthorizedUser, async (ctx) => {
    ctx.session.flowType = 'edit'
    const msg = await ctx.reply(
      'Selecciona la tarea a editar:',
      registerTaskSelector.getKeyboard(ctx.from.id, 'select_edit')
    )
    ctx.session.menuMessageId = msg.message_id
  })

  // 2) Callback para cualquier select_edit_<taskId>
  registerTaskSelector(bot, 'select_edit', async (ctx, task) => {
    await safeAnswerCbQuery(ctx)

    // inicializa el flujo de edición
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.awaiting = null
    ctx.session.timezone = await getUserTimezone(ctx.from.id)

    // construye menú SIN “Guardar”
    const { text, markup } = buildEditMenu(task, ctx.session.timezone, false)

    try {
      // intenta editar el mensaje original
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.menuMessageId,
        null,
        text,
        { parse_mode: 'HTML', ...markup }
      )
    } catch {
      // fallback: reenvía como nuevo mensaje
      const newMsg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = newMsg.message_id
    }
  })
}
