import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { showEditMenu } from '../../helpers/taskHelpers/edit/showEditMenu.js'

/**
 * Arranca el flujo /edit:
 *  - Muestra selector de tareas
 *  - Al elegir, inicializa sesión y envía el menú de edición (con botón "Guardar")
 */
export function registerStartEditAction(bot) {
  // 1) Comando /edit
  bot.command('edit', isAuthorizedUser, async (ctx) => {
    ctx.session.flowType = 'edit'
    // despliega selector
    const msg = await ctx.reply(
      'Selecciona la tarea a editar:',
      registerTaskSelector.getKeyboard(ctx.from.id, 'select_edit')
    )
    ctx.session.menuMessageId = msg.message_id
  })

  // 2) Callback al elegir tarea
  bot.action('select_edit', async (ctx) => {
    await ctx.answerCbQuery()
    const task = await registerTaskSelector.resolve(ctx)

    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.awaiting = null
    ctx.session.timezone = await getUserTimezone(ctx.from.id)

    // envío primera vez el menú con botón "Guardar cambios"
    return showEditMenu(ctx, true)
  })
}
