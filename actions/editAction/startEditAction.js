import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
import { getTaskSelectionKeyboard } from '../../helpers/taskHelpers/edit/taskSelection.js'

console.log('🧪 Archivo startEditAction.js fue cargado')

export function registerStartEditAction(bot) {
  console.log('🧪 registerStartEditAction() fue invocado')

  bot.command('edit', isAuthorizedUser, async (ctx) => {
    console.log('🟢 [DEBUG] Entró al handler /edit')

    console.log('ANTES DE MODIFICAR ctx.session:', ctx.session)
    ctx.session.flowType = 'edit'
    console.log('DESPUÉS DE MODIFICAR ctx.session:', ctx.session)

    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    delete ctx.session.menuMessageId
    delete ctx.session.editing
    delete ctx.session.edits
    delete ctx.session.timezone

    try {
      console.log('🔍 [DEBUG] Ejecutando getTaskSelectionKeyboard()...')
      const keyboard = await getTaskSelectionKeyboard(
        ctx.from.id,
        'select_edit'
      )
      console.log('📦 [DEBUG] Resultado keyboard:', keyboard)

      if (!keyboard) {
        console.log('🚫 [DEBUG] No se encontraron tareas para editar.')
        return ctx.reply('No tienes tareas activas para editar.')
      }

      const msg = await ctx.reply(
        'Selecciona la tarea que quieres editar:',
        keyboard
      )
      ctx.session.menuMessageId = msg.message_id
    } catch (error) {
      console.error('❌ [ERROR] Al mostrar el selector de tareas:', error)
      return ctx.reply(
        'Ocurrió un error al intentar mostrar tus tareas. Inténtalo más tarde.'
      )
    }
  })

  bot.action(/^select_edit_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    const task = await registerTaskSelector.resolve(ctx)

    ctx.session.flowType = 'edit'
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.awaiting = null
    ctx.session.timezone = await getUserTimezone(ctx.from.id)

    const { text, markup } = buildEditMenu(task, ctx.session.timezone, false)

    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.menuMessageId,
        null,
        text,
        { parse_mode: 'HTML', ...markup }
      )
    } catch {
      const newMsg = await ctx.reply(text, markup)
      ctx.session.menuMessageId = newMsg.message_id
    }
  })
}
