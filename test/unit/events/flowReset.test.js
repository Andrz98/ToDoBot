import { describe, it, expect } from 'vitest'
import { makeFakeBot, makeCtx } from '../../support/telegram.js'
import { registerFlowResetHandler } from '@/events/middlewareEventFlowReset/flowReset.js'

describe('flow_reset', () => {
  it('limpia todo el estado de flujo, incluido el token de /clear, y sus mensajes', async () => {
    const bot = makeFakeBot()
    registerFlowResetHandler(bot)
    const ctx = makeCtx({
      update: { callback_query: { message: { message_id: 5 } } },
      session: {
        flowType: 'clear',
        awaiting: 'new_name',
        editing: { id: '1' },
        edits: { newName: 'x' },
        pendingTask: { name: 'y' },
        pendingDelete: 'a',
        pendingComplete: 'b',
        pendingTz: 'America/Bogota',
        pendingClearToken: 'tok',
        menuMessageId: 10,
        promptMessageId: 11,
        timezone: 'Europe/Madrid'
      }
    })

    await bot.press('flow_reset', ctx)

    expect(ctx.session).toEqual({
      flowType: null,
      awaiting: null,
      editing: null,
      edits: null,
      pendingTask: null,
      pendingDelete: null,
      pendingComplete: null,
      pendingTz: null,
      pendingClearToken: null,
      timezone: null
    })
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 10)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 11)
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Flujo restablecido'),
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
  })
})
