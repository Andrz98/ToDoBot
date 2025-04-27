import { sleep } from '../delayUtils/sleep.js'

/**
 * Envía un mensaje con reintentos ante ECONNRESET
 *
 * @param {import('telegraf').Telegraf} bot
 * @param {number|string} chatId
 * @param {string} text
 * @param {object} opts
 * @param {number} retries
 * @param {number} msBase
 */
export async function safeSendMessage(
  bot,
  chatId,
  text,
  opts = {},
  retries = 3,
  msBase = 500
) {
  let attempt = 0
  while (true) {
    try {
      return await bot.telegram.sendMessage(chatId, text, opts)
    } catch (err) {
      // Sólo retry en ECONNRESET
      if (++attempt > retries || err.code !== 'ECONNRESET') {
        throw err
      }
      await sleep(msBase * attempt)
    }
  }
}
