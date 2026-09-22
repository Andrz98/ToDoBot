import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  discardFlowMessages,
  closeInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { resetFlowSession } from '../../helpers/session/resetFlowSession.js'

const RESET_TEXT = 'Flujo restablecido. Ya puedes usar comandos normalmente.'

/**
 * Registra el callback `flow_reset` para limpiar cualquier flujo activo
 */
export function registerFlowResetHandler(bot) {
  bot.action('flow_reset', async (ctx) => {
    await safeAnswerCbQuery(ctx, 'Acción restablecida')
    // La interfaz y el prompt del flujo abandonado ya no sirven: fuera ahora
    await discardFlowMessages(ctx)

    resetFlowSession(ctx.session)

    return closeInterface(ctx, RESET_TEXT)
  })
}
