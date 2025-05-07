import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'

/**
 * Arranca el flujo /edit:
 *  - Muestra selector de tareas
 *  - Al elegir, inicializa sesión y envía el menú de edición
 */
export function registerStartEditAction(bot) {
  // Comando /edit
  bot.command('edit', isAuthorizedUser, async (ctx) => {
    ctx.session.flowType = 'edit'
    // Mostramos el selector (keyboard de registerTaskSelector)
    const msg = await ctx.reply(
      'Selecciona la tarea a editar:',
      registerTaskSelector.getKeyboard(ctx.from.id, 'select_edit')
    )
    ctx.session.menuMessageId = msg.message_id
  })

  // Callback al elegir una tarea
  bot.action('select_edit', async (ctx) => {
    await ctx.answerCbQuery()
    // Resolvemos la tarea seleccionada
    const task = await registerTaskSelector.resolve(ctx)

    // Inicializamos el flujo
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.awaiting = null
    ctx.session.timezone = await getUserTimezone(ctx.from.id)

    // Construimos el menú SIN botón "Guardar"
    const { text, markup } = buildEditMenu(task, ctx.session.timezone, false)

    // Intentamos editar el mensaje original
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.menuMessageId,
        null,
        text,
        { parse_mode: 'HTML', ...markup }
      )
    } catch {
      // Si no existe (p.ej. cerraron el menú), reenviamos
      const newMsg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = newMsg.message_id
    }
  })
}
