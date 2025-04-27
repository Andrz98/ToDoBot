import { sleep } from '../delayUtils/sleep.js'
/**
 * Intenta enviar un reply hasta N veces con backoff.
 *
 * @param {Context} ctx
 * @param {string} text
 * @param {object} opts
 * @param {number} retries  – Nº máximo de reintentos (p. ej. 3)
 * @param {number} msBase   – Delay base en ms (backoff exponencial)
 */
export const safeReply = async (
  ctx,
  text,
  opts = {},
  retries = 3,
  msBase = 500
) => {
  let attempt = 0
  while (true) {
    try {
      return await ctx.reply(text, opts)
    } catch (err) {
      attempt++
      if (attempt > retries || err.code !== 'ECONNRESET') {
        throw err
      }
      // backoff exponencial
      await sleep(msBase * Math.pow(2, attempt - 1))
    }
  }
}
