import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { buildAddButton } from '../../helpers/taskHelpers/add/addCommand.js'

/**
 * Registra el comando /add:
 *  - Resetea la sesión
 *  - Envía el botón “Crear tarea” y guarda su message_id
 */
export function registerStartAddAction(bot) {
  bot.command('add', isAuthorizedUser, async (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.pendingTask = {}
    ctx.session.awaiting = null

    const { text, markup } = buildAddButton()
    const msg = await ctx.reply(text, markup)
    // Guardamos el ID de este mensaje para futuras ediciones
    ctx.session.menuMessageId = msg.message_id
  })
}
