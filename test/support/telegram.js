import { vi } from 'vitest'

/** Bot falso: registra los handlers de bot.action para poder "pulsar" botones. */
export const makeFakeBot = () => {
  const actions = []
  const messageHandlers = []
  return {
    action: (trigger, fn) => actions.push({ trigger, fn }),
    on: (_event, fn) => messageHandlers.push(fn),
    /** Simula un mensaje de texto entrante (primer handler de bot.on('message')). */
    async say(ctx, next = vi.fn()) {
      return messageHandlers[0](ctx, next)
    },
    /** Simula pulsar un botón con ese callback_data. */
    async press(data, ctx) {
      for (const { trigger, fn } of actions) {
        const match =
          trigger instanceof RegExp
            ? data.match(trigger)
            : trigger === data
              ? [data]
              : null
        if (match) {
          ctx.match = match
          ctx.callbackQuery = { ...ctx.callbackQuery, data }
          return fn(ctx)
        }
      }
      throw new Error(`Ningún handler para "${data}"`)
    }
  }
}

export const makeCtx = (overrides = {}) => ({
  from: { id: 7 },
  chat: { id: 99 },
  session: {},
  callbackQuery: { message: { message_id: 5 } },
  reply: vi.fn().mockResolvedValue({ message_id: 6 }),
  answerCbQuery: vi.fn().mockResolvedValue(true),
  editMessageReplyMarkup: vi.fn().mockResolvedValue(true),
  deleteMessage: vi.fn().mockResolvedValue(true),
  telegram: {
    editMessageText: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true)
  },
  ...overrides
})
