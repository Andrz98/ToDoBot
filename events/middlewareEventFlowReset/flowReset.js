import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  discardFlowMessages,
  closeInterface
} from '../../utils/telegramUtils/flowMessages.js'

const RESET_TEXT = 'Flujo restablecido. Ya puedes usar comandos normalmente.'

/**
 * Registra el callback `flow_reset` para limpiar cualquier flujo activo
 */
export function registerFlowResetHandler(bot) {
  bot.action('flow_reset', async (ctx) => {
    await safeAnswerCbQuery(ctx, 'Acción restablecida')
    // La interfaz y el prompt del flujo abandonado ya no sirven: fuera ahora
    await discardFlowMessages(ctx)

    ctx.session.flowType = null
    ctx.session.awaiting = null
    ctx.session.editing = null
    ctx.session.edits = null
    ctx.session.pendingTask = null
    ctx.session.pendingDelete = null
    ctx.session.pendingComplete = null
    ctx.session.pendingTz = null
    ctx.session.pendingClearToken = null
    ctx.session.timezone = null

    return closeInterface(ctx, RESET_TEXT)
  })
}
