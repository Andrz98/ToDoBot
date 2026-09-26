import { Markup } from 'telegraf'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { registerTaskSelector } from '../../helpers/tasks/taskSelector.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { getTaskSelectionKeyboard } from '../../helpers/taskHelpers/edit/taskSelection.js'
import {
  openInterface,
  discardFlowMessages,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { replyTemporary } from '../../utils/telegramUtils/messageLifecycle.js'
import { resetEditSession, renderEditMenu } from './editMenu.js'
import { replyEmptyState } from '../../helpers/menu/mainMenu.js'
import { FINISH_ACTION_LABEL } from '../../helpers/replyMessages/genericReplyMessages.js'

export async function startEdit(ctx) {
  delete ctx.session.pendingTask
  resetEditSession(ctx)

  try {
    const keyboard = await getTaskSelectionKeyboard(ctx.from.id, 'select_edit')
    if (!keyboard) {
      await discardFlowMessages(ctx)
      return replyEmptyState(ctx, '📭 No tienes tareas activas para editar.')
    }

    ctx.session.flowType = 'edit'
    keyboard.reply_markup.inline_keyboard.push([
      Markup.button.callback(FINISH_ACTION_LABEL, 'edit_cancel')
    ])
    await openInterface(ctx, 'Selecciona la tarea que quieres editar:', keyboard)
  } catch (error) {
    console.error('❌ Error en /edit:', error)
    delete ctx.session.flowType
    return replyTemporary(ctx, 'Ocurrió un error al intentar mostrar tus tareas.')
  }
}

export function registerStartEditAction(bot) {
  bot.command('edit', isAuthorizedUser, startEdit)

  registerTaskSelector(bot, 'select_edit', async (ctx, task) => {
    if (!isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    ctx.session.flowType = 'edit'
    ctx.session.editing = { id: task._id, oldName: task.name }
    ctx.session.edits = {}
    ctx.session.timezone = await getUserTimezone(ctx.from.id)
    return renderEditMenu(ctx, task, ctx.session.timezone)
  })
}
