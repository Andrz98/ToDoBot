import { sleep } from '../delayUtils/sleep.js'

export async function safeAnswerCbQuery(
  ctx,
  textOrOpts = {},
  opts = {},
  retries = 3
) {
  let attempt = 0
  while (true) {
    try {
      // permite dos firmas: answerCbQuery(text, opts) o answerCbQuery(opts)
      if (typeof textOrOpts === 'string') {
        return await ctx.answerCbQuery(textOrOpts, opts)
      } else {
        return await ctx.answerCbQuery(textOrOpts)
      }
    } catch (err) {
      if (++attempt > retries || err.code !== 'ECONNRESET') {
        throw err
      }
      await sleep(200 * attempt)
    }
  }
}
