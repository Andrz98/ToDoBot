import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { openInterface } from '../../utils/telegramUtils/flowMessages.js'

/**
 * /add: abre directamente el menú del flujo, sustituyendo cualquier interfaz
 * de un flujo anterior que siguiera en pantalla.
 */
export async function startAdd(ctx) {
  delete ctx.session.editing
  delete ctx.session.edits
  ctx.session.flowType = 'add'
  ctx.session.pendingTask = {}
  ctx.session.awaiting = null

  const { text, markup } = buildAddMenu()
  await openInterface(ctx, text, markup)
}

export function registerStartAddAction(bot) {
  bot.command('add', isAuthorizedUser, startAdd)
}
