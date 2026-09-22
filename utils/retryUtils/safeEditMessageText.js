import { sleep } from '../delayUtils/sleep.js'

/**
 * Edita el texto del mensaje de la propia interacción (callback_query) con reintentos
 * ante ECONNRESET. Por defecto quita el teclado inline, ya que todo consumidor de esta
 * utilidad la usa para "asentar" un mensaje de confirmación en su resultado final.
 */
export async function safeEditMessageText(ctx, text, extra = {}, retries = 3) {
  const opts = { reply_markup: { inline_keyboard: [] }, ...extra }
  let attempt = 0
  while (true) {
    try {
      return await ctx.editMessageText(text, opts)
    } catch (err) {
      if (++attempt > retries || err.code !== 'ECONNRESET') {
        throw err
      }
      await sleep(200 * attempt)
    }
  }
}
