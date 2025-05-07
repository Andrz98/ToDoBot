import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'

/**
 * Arranca el flujo /edit:
 *  - Comando /edit
 *  - Callback select_edit_… para montar la sesión y mostrar el menú de edición
 */
export function registerStartEditAction(bot) {
  // 1) /edit → desplegar selector de tareas
  bot.command('edit', isAuthorizedUser, async (ctx) => {
    ctx.session.flowType = 'edit'
    // pongo el inline keyboard para elegir tarea
    const msg = await ctx.reply(
      'Selecciona la tarea que quieres editar:',
      registerTaskSelector.getKeyboard(ctx.from.id, 'select_edit')
    )
    ctx.session.menuMessageId = msg.message_id
  })

  // 2) Cuando pulsan uno de esos botones → iniciar edición
  bot.action(/^select_edit_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    // extraigo el ID de la tarea del callback_data
    const task = await registerTaskSelector.resolve(ctx)
    // inicializo sesión de edición
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.awaiting = null
    ctx.session.timezone = await getUserTimezone(ctx.from.id)

    // construyo menú sin “Guardar”
    const { text, markup } = buildEditMenu(task, ctx.session.timezone, false)
    // intento editar el mensaje original
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.menuMessageId,
        null,
        text,
        { parse_mode: 'HTML', ...markup }
      )
    } catch {
      // si no se puede (usuario cerró el menú), reenviamos uno nuevo
      const newMsg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = newMsg.message_id
    }
  })
}
