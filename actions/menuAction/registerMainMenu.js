import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { UNAUTHORIZED_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

/**
 * Botones `menu_<comando>`: ejecutan el mismo handler que el comando escrito,
 * con la misma comprobación de autorización.
 * @param {import('telegraf').Telegraf} bot
 * @param {Record<string, (ctx) => Promise<any>>} handlers – comando → handler
 */
export function registerMainMenu(bot, handlers) {
  bot.action(/^menu_(\w+)$/, async (ctx) => {
    const handler = handlers[ctx.match[1]]
    if (!handler) {
      return safeAnswerCbQuery(ctx, 'Acción no disponible.', { show_alert: true })
    }
    if (!(await isUserAuthorized(ctx))) {
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }
    await safeAnswerCbQuery(ctx)
    return handler(ctx)
  })
}
