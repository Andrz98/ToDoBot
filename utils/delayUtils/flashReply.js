import { safeReply } from '../retryUtils/safeReply.js'
import { safeDeleteMessage } from '../telegramUtils/safeDeleteMessage.js'

/**
 * Sends a temporary reply that is deleted after a delay.
 *
 * @param {import('telegraf').Context} ctx - Bot context
 * @param {string} text - Message text
 * @param {object} opts - Options for ctx.reply
 * @param {number} ms - Time in ms before deleting the message
 */
export const flashReply = async (ctx, text, opts = {}, ms = 1500) => {
  const msg = await safeReply(ctx, text, opts)
  setTimeout(() => {
    safeDeleteMessage(ctx, ctx.chat.id, msg.message_id)
  }, ms)
  return msg
}
