import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  findById: vi.fn(),
  findByIdAndDelete: vi.fn(),
  findOneAndDelete: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/models/task.js', () => ({
  Task: {
    findById: h.findById,
    findByIdAndDelete: h.findByIdAndDelete,
    findOneAndDelete: h.findOneAndDelete
  }
}))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: vi.fn() }))

import { registerDeleteActions } from '@/actions/deleteAction/deleteActionHandlers.js'

describe('flujo /delete', () => {
  let bot, ctx
  beforeEach(() => {
    Object.values(h).forEach((fn) => fn.mockReset())
    h.findTask.mockResolvedValue({ name: 'Pagar luz' })
    bot = makeFakeBot()
    ctx = makeCtx()
    registerDeleteActions(bot)
  })

  it('al seleccionar, solo busca tareas del propio usuario', async () => {
    await bot.press('delete_select:abc123', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
    expect(ctx.session.pendingDelete).toBe('abc123')
  })

  it('tarea ajena: avisa y no abre el flujo', async () => {
    h.findTask.mockResolvedValue(null)

    await bot.press('delete_select:abc123', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.session.pendingDelete).toBeUndefined()
  })

  it('escapa el HTML del nombre en la confirmación', async () => {
    h.findTask.mockResolvedValue({ name: 'a<b>&' })

    await bot.press('delete_select:abc123', ctx)

    expect(ctx.reply.mock.calls[0][0]).toContain('<b>a&lt;b&gt;&amp;</b>')
  })

  it('al confirmar, borra solo si la tarea es del usuario', async () => {
    ctx.session.pendingDelete = 'abc123'

    await bot.press('delete_confirm:yes', ctx)

    expect(h.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'abc123',
      userId: 7
    })
    expect(h.findByIdAndDelete).not.toHaveBeenCalled()
  })
})
