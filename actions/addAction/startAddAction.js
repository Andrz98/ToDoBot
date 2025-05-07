// actions/addAction/startAddAction.js

import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { buildAddButton } from '../../helpers/taskHelpers/add/addCommand.js'

/**
 * Registra el comando /add:
 *  - Resetea la sesión
 *  - Muestra el botón “Crear tarea” y guarda el message_id del menú
 */
export function registerStartAddAction(bot) {
  bot.command('add', isAuthorizedUser, async (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.pendingTask = {}
    ctx.session.awaiting = null

    const { text, markup } = buildAddButton()
    const msg = await ctx.reply(text, markup)
    // Guardamos el ID del mensaje para posteriores ediciones
    ctx.session.menuMessageId = msg.message_id
  })
}
