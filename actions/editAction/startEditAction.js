import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
// 🔧 Este helper lo vamos a comprobar en pasos siguientes
import { getTaskSelectionKeyboard } from '../../helpers/tasks/common/taskSelection.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'

debugLog('🧪 Archivo startEditAction.js fue cargado')

export function registerStartEditAction(bot) {
  debugLog('🧪 registerStartEditAction() fue invocado')

  bot.command('edit', isAuthorizedUser, async (ctx) => {
    debugLog('🟢 [DEBUG] Entró al handler /edit')
    debugLog('ANTES DE LIMPIAR ctx.session:', ctx.session)

    // 🧹 Paso 1: limpiar flujo anterior
    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    delete ctx.session.menuMessageId
    delete ctx.session.editing
    delete ctx.session.edits
    delete ctx.session.timezone

    // ✅ Paso 2: marcar nuevo flujo
    ctx.session.flowType = 'edit'

    debugLog('DESPUÉS DE SETEAR flowType:', ctx.session)

    try {
      // ⚠️ Paso 3: Validar funcionamiento real del helper
      const keyboard = await getTaskSelectionKeyboard(
        ctx.from.id,
        'select_edit'
      )

      if (!keyboard || !keyboard.reply_markup) {
        console.error(
          '❌ [getTaskSelectionKeyboard] No devolvió un teclado válido'
        )
        return ctx.reply('⚠️ Error: No se pudo generar el selector de tareas.')
      }

      // ✅ Paso 4: mostrar mensaje con teclado
      const msg = await ctx.reply(
        'Selecciona la tarea que quieres editar:',
        keyboard
      )
      ctx.session.menuMessageId = msg.message_id
    } catch (error) {
      console.error('❌ Error en /edit:', error)
      return ctx.reply('Ocurrió un error al intentar mostrar tus tareas.')
    }
  })

  // ✅ Flujo cuando el usuario elige una tarea para editar
  registerTaskSelector(bot, 'select_edit', async (ctx, task) => {
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
