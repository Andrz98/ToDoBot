import { describe, it, expect } from 'vitest'
import { makeFakeBot, makeCtx } from '../../support/telegram.js'
import { registerFlowResetHandler } from '@/events/middlewareEventFlowReset/flowReset.js'

describe('flow_reset', () => {
  it('limpia todo el estado de flujo, incluido el token de /clear', async () => {
    const bot = makeFakeBot()
    registerFlowResetHandler(bot)
    const ctx = makeCtx({
      update: { callback_query: { message: { message_id: 5 } } },
      session: {
        flowType: 'clear',
        awaiting: 'new_name',
        editing: { id: '1' },
        pendingDelete: 'a',
        pendingComplete: 'b',
        pendingTz: 'America/Bogota',
        pendingClearToken: 'tok'
      }
    })

    await bot.press('flow_reset', ctx)

    expect(ctx.session).toEqual({
      flowType: null,
      awaiting: null,
      editing: null,
      pendingDelete: null,
      pendingComplete: null,
      pendingTz: null,
      pendingClearToken: null
    })
  })
})
