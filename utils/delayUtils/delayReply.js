import { sleep } from './sleep.js'
import { safeReply } from './safeReply.js'

/**
 * Envía un reply tras esperar un tiempo.
 *
 * @param {import('telegraf').Context} ctx
 * @param {string} text   – Texto a enviar
 * @param {object} opts   – Opciones de ctx.reply (parse_mode, reply_markup…)
 * @param {number} ms     – Milisegundos de delay antes de enviar
 * @returns {Promise}
 */
export const delayReply = async (ctx, text, opts = {}, ms = 1000) => {
  await sleep(ms)
  return safeReply(ctx, text, opts)
}
