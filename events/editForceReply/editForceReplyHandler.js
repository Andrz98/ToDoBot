/**
 * Versión temporal del handler forceReply:
 * Solo intercepta y deja pasar mensajes.
 * Permite depurar si este archivo es el que bloquea /edit.
 *
 * @param {import('telegraf').Telegraf} bot
 */
export function registerForceReplyHandler(bot) {
  bot.on('message', async (ctx, next) => {
    console.log('🧪 [TRACE:forceReply] Recibido mensaje:', ctx.message?.text)
    return typeof next === 'function' ? next() : undefined
  })
}
