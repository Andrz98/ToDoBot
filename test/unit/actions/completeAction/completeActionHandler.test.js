import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/models/task.js', () => ({
  Task: {
    findById: h.findById,
    findByIdAndUpdate: h.findByIdAndUpdate,
    findOneAndUpdate: h.findOneAndUpdate
  }
}))

import { registerCompleteActions } from '@/actions/completeAction/completeActionHandler.js'

describe('flujo /done', () => {
  let bot, ctx
  beforeEach(() => {
    Object.values(h).forEach((fn) => fn.mockReset())
    h.findTask.mockResolvedValue({ name: 'Pagar luz' })
    bot = makeFakeBot()
    ctx = makeCtx()
    registerCompleteActions(bot)
  })

  it('al seleccionar, solo busca tareas del propio usuario', async () => {
    await bot.press('complete_select:abc123', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
    expect(ctx.session.pendingComplete).toBe('abc123')
  })

  it('tarea ajena: avisa y no abre el flujo', async () => {
    h.findTask.mockResolvedValue(null)

    await bot.press('complete_select:abc123', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.session.pendingComplete).toBeUndefined()
  })

  it('escapa el HTML del nombre en la confirmación', async () => {
    h.findTask.mockResolvedValue({ name: 'a<b>&' })

    await bot.press('complete_select:abc123', ctx)

    expect(ctx.reply.mock.calls[0][0]).toContain('<b>a&lt;b&gt;&amp;</b>')
  })

  it('al confirmar, completa solo si la tarea es del usuario', async () => {
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_confirm:yes', ctx)

    expect(h.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc123', userId: 7 },
      { completed: true }
    )
    expect(h.findByIdAndUpdate).not.toHaveBeenCalled()
  })
})
