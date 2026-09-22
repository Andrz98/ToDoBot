import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ deleteMany: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: { deleteMany: h.deleteMany } }))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: vi.fn() }))

import { registerClearActions } from '@/actions/clearAction/clearActionHandler.js'

describe('/clear: confirmación', () => {
  let bot, ctx
  beforeEach(() => {
    h.deleteMany.mockReset().mockResolvedValue({ deletedCount: 2 })
    bot = makeFakeBot()
    registerClearActions(bot)
    ctx = makeCtx({
      session: { flowType: 'clear', pendingClearToken: 'tok-1' }
    })
  })

  it('"Sí" con token válido borra solo las tareas completadas del usuario', async () => {
    await bot.press('clear_confirm_tok-1:yes', ctx)

    expect(h.deleteMany).toHaveBeenCalledWith({ userId: 7, completed: true })
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingClearToken).toBeNull()
  })

  it('con un token que no coincide no borra nada', async () => {
    await bot.press('clear_confirm_otro:yes', ctx)

    expect(h.deleteMany).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Operación inválida o expirada.',
      { show_alert: true }
    )
  })

  it('"No" cancela y limpia el flujo', async () => {
    await bot.press('clear_confirm_tok-1:no', ctx)

    expect(h.deleteMany).not.toHaveBeenCalled()
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingClearToken).toBeNull()
  })
})
