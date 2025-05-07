// actions/addAction/startAddAction.js

import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { buildAddButton } from '../../helpers/taskHelpers/add/addCommand.js'

/**
 * Registra el comando /add:
 *  - Resetea la sesión
 *  - Muestra el botón “Crear tarea”
 */
export function registerStartAddAction(bot) {
  bot.command('add', isAuthorizedUser, (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.pendingTask = {}
    ctx.session.awaiting = null
    const { text, markup } = buildAddButton()
    return ctx.reply(text, markup)
  })
}
