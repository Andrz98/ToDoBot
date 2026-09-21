import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { findOneAndUpdate: h.update }
}))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: vi.fn() }))

import { registerTimezoneActions } from '@/actions/timezoneAction/timezoneActionHandlers.js'

describe('/settimezone: botones', () => {
  let bot, ctx
  beforeEach(() => {
    h.update.mockReset().mockResolvedValue({ userId: 7 })
    bot = makeFakeBot()
    registerTimezoneActions(bot)
    ctx = makeCtx()
  })

  it('una zona válida pide confirmación', async () => {
    await bot.press('set_tz_America/Bogota', ctx)

    expect(ctx.session.pendingTz).toBe('America/Bogota')
    expect(ctx.reply.mock.calls[0][0]).toContain('America/Bogota')
  })

  it('una zona fuera de la lista blanca se rechaza sin tocar la sesión', async () => {
    await bot.press('set_tz_Mars/Olympus', ctx)

    expect(ctx.session.pendingTz).toBeUndefined()
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(expect.any(String), {
      show_alert: true
    })
  })

  it('confirmar con una zona válida en sesión la guarda', async () => {
    ctx.session.pendingTz = 'America/Bogota'

    await bot.press('confirm_tz_yes', ctx)

    expect(h.update).toHaveBeenCalledWith(
      { userId: 7 },
      { timezone: 'America/Bogota' },
      { new: true }
    )
    expect(ctx.session.timezone).toBe('America/Bogota')
  })

  it('confirmar sin zona pendiente (sesión perdida) no escribe en la base de datos', async () => {
    await bot.press('confirm_tz_yes', ctx)

    expect(h.update).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(expect.any(String), {
      show_alert: true
    })
  })
})
