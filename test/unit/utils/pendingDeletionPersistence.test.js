import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  readyState: 0,
  updateOne: vi.fn().mockResolvedValue(undefined),
  deleteOne: vi.fn().mockResolvedValue(undefined),
  find: vi.fn()
}))
vi.mock('mongoose', () => ({
  default: {
    get connection() {
      return { readyState: h.readyState }
    }
  }
}))
vi.mock('@/models/pendingDeletion.js', () => ({
  PendingDeletion: {
    updateOne: h.updateOne,
    deleteOne: h.deleteOne,
    find: h.find
  }
}))

import {
  TTL,
  scheduleDeletion,
  cancelDeletion,
  deleteNow,
  recoverPendingDeletions
} from '@/utils/telegramUtils/messageLifecycle.js'

const ctxFor = (chatId) => ({
  chat: { id: chatId },
  telegram: { deleteMessage: vi.fn().mockResolvedValue(true) }
})

describe('persistencia de borrados pendientes (sobrevivir a un reinicio)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    h.readyState = 0
    h.updateOne.mockClear()
    h.deleteOne.mockClear()
    h.find.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('sin conexión a BD (p. ej. en tests) no intenta escribir nada', async () => {
    const ctx = ctxFor(1)
    scheduleDeletion(ctx, 10, TTL.STEP)
    await vi.advanceTimersByTimeAsync(TTL.STEP)

    expect(h.updateOne).not.toHaveBeenCalled()
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(1, 10)
  })

  it('con BD conectada, programar guarda una copia y borrar la retira', async () => {
    h.readyState = 1
    const ctx = ctxFor(2)

    scheduleDeletion(ctx, 10, TTL.STEP)
    expect(h.updateOne).toHaveBeenCalledWith(
      { chatId: 2, messageId: 10 },
      { deleteAt: expect.any(Date) },
      { upsert: true }
    )

    cancelDeletion(2, 10)
    expect(h.deleteOne).toHaveBeenCalledWith({ chatId: 2, messageId: 10 })
  })

  it('al vencer el temporizador, también retira la copia persistida', async () => {
    h.readyState = 1
    const ctx = ctxFor(3)

    scheduleDeletion(ctx, 10, TTL.STEP)
    h.deleteOne.mockClear()
    await vi.advanceTimersByTimeAsync(TTL.STEP)

    expect(h.deleteOne).toHaveBeenCalledWith({ chatId: 3, messageId: 10 })
  })

  it('deleteNow también limpia la copia persistida', async () => {
    h.readyState = 1
    const ctx = ctxFor(4)
    scheduleDeletion(ctx, 10, TTL.INTERFACE)
    h.deleteOne.mockClear()

    await deleteNow(ctx, 10)

    expect(h.deleteOne).toHaveBeenCalledWith({ chatId: 4, messageId: 10 })
  })

  it('al recuperar: lo ya vencido se borra en el acto', async () => {
    h.readyState = 1
    h.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          { chatId: 5, messageId: 20, deleteAt: new Date(Date.now() - 1000) }
        ])
    })
    const bot = { telegram: { deleteMessage: vi.fn().mockResolvedValue(true) } }

    await recoverPendingDeletions(bot)

    expect(bot.telegram.deleteMessage).toHaveBeenCalledWith(5, 20)
    expect(h.deleteOne).toHaveBeenCalledWith({ chatId: 5, messageId: 20 })
  })

  it('al recuperar: lo que aún no vence se rearma con el tiempo restante', async () => {
    h.readyState = 1
    h.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          { chatId: 6, messageId: 30, deleteAt: new Date(Date.now() + 5_000) }
        ])
    })
    const bot = { telegram: { deleteMessage: vi.fn().mockResolvedValue(true) } }

    await recoverPendingDeletions(bot)

    expect(bot.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(4_999)
    expect(bot.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(bot.telegram.deleteMessage).toHaveBeenCalledWith(6, 30)
  })

  it('sin conexión a BD, recuperar no hace nada (no rompe el arranque)', async () => {
    h.readyState = 0
    const bot = { telegram: { deleteMessage: vi.fn() } }

    await expect(recoverPendingDeletions(bot)).resolves.toBeUndefined()
    expect(h.find).not.toHaveBeenCalled()
  })
})
