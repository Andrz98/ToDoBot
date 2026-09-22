import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { chatCleanup } from '@/middlewares/chatCleanup/chatCleanup.js'
import {
  TTL,
  scheduleDeletion
} from '@/utils/telegramUtils/messageLifecycle.js'

const baseCtx = (extra) => ({
  chat: { id: 9 },
  telegram: { deleteMessage: vi.fn().mockResolvedValue(true) },
  ...extra
})

describe('chatCleanup', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('borra el comando solo después de procesarlo, con la cadencia de un paso', async () => {
    const ctx = baseCtx({ message: { text: '/list', message_id: 30 } })
    const next = vi.fn(async () => {
      expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    })

    await chatCleanup(ctx, next)

    expect(next).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(TTL.STEP - 1)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(9, 30)
  })

  it('si el handler falla, el error sigue su curso y el comando igualmente se limpia', async () => {
    const ctx = baseCtx({ message: { text: '/add', message_id: 31 } })

    await expect(
      chatCleanup(ctx, () => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom')

    await vi.advanceTimersByTimeAsync(TTL.STEP)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(9, 31)
  })

  it('no toca mensajes de texto normales (los gestiona cada flujo)', async () => {
    const ctx = baseCtx({ message: { text: 'Comprar pan', message_id: 32 } })

    await chatCleanup(ctx, vi.fn())

    await vi.advanceTimersByTimeAsync(TTL.INTERFACE)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
  })

  it('pulsar un botón de un flujo activo renueva su ventana de vida (flowExpiresAt)', async () => {
    const ctx = baseCtx({
      callbackQuery: { message: { message_id: 40 } },
      session: { flowType: 'add', flowExpiresAt: Date.now() - 1 }
    })

    await chatCleanup(ctx, vi.fn())

    expect(ctx.session.flowExpiresAt).toBeGreaterThan(Date.now())
  })

  it('pulsar un botón sin flujo activo (p. ej. /list) no toca flowExpiresAt', async () => {
    const ctx = baseCtx({
      callbackQuery: { message: { message_id: 40 } },
      session: {}
    })

    await chatCleanup(ctx, vi.fn())

    expect(ctx.session.flowExpiresAt).toBeUndefined()
  })

  it('pulsar un botón renueva la interfaz que lo contiene', async () => {
    const ctx = baseCtx({ callbackQuery: { message: { message_id: 40 } } })
    scheduleDeletion(ctx, 40, TTL.INTERFACE)
    await vi.advanceTimersByTimeAsync(TTL.INTERFACE - 1_000)

    await chatCleanup(ctx, vi.fn())
    await vi.advanceTimersByTimeAsync(TTL.INTERFACE - 1_000)

    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(9, 40)
  })
})
