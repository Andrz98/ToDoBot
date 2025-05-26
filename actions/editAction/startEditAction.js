import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
import { getTaskSelectionKeyboard } from '../../helpers/taskHelpers/edit/taskSelection.js'

/**
 * Arranca el flujo /edit:
 *  - Comando /edit
 *  - Callback select_edit_… para montar la sesión y mostrar el menú de edición
 */
export function registerStartEditAction(bot) {
  // 1) /edit → desplegar selector de tareas
  bot.command('edit', isAuthorizedUser, async (ctx) => {
    // ——————————————
    // Limpio cualquier estado de flujos anteriores
    // ——————————————
    console.log('ANTES DE MODIFICAR ctx.session:', ctx.session)

    ctx.session.flowType = 'edit'

    console.log('DESPUÉS DE MODIFICAR ctx.session:', ctx.session)

    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    delete ctx.session.menuMessageId
    delete ctx.session.editing
    delete ctx.session.edits
    delete ctx.session.timezone

    // ——————————————
    // Ahora sí, inicializo el flujo de edición
    // ——————————————
    ctx.session.flowType = 'edit'

    // muestro el selector de tareas
    try {
      const keyboard = await getTaskSelectionKeyboard(
        ctx.from.id,
        'select_edit'
      )

      if (!keyboard) {
        return ctx.reply('No tienes tareas activas para editar.')
      }

      const msg = await ctx.reply(
        'Selecciona la tarea que quieres editar:',
        keyboard
      )
      ctx.session.menuMessageId = msg.message_id
    } catch (error) {
      console.error('Error al mostrar el selector de tareas:', error)
      return ctx.reply(
        'Ocurrió un error al intentar mostrar tus tareas. Inténtalo más tarde.'
      )
    }
  })

  // 2) Cuando pulsan uno de esos botones → iniciar edición
  bot.action(/^select_edit_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    // extraigo el ID de la tarea del callback_data
    const task = await registerTaskSelector.resolve(ctx)

    // inicializo la sesión de edición
    ctx.session.flowType = 'edit'
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.awaiting = null
    ctx.session.timezone = await getUserTimezone(ctx.from.id)

    // construyo el menú sin “Guardar”
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
      // si no existe (usuario cerró el menú), reenviamos uno nuevo
      const newMsg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = newMsg.message_id
    }
  })
}
