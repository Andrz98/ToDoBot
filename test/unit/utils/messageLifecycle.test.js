import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  TTL,
  scheduleDeletion,
  renewDeletion,
  cancelDeletion,
  deleteNow,
  replyTemporary
} from '@/utils/telegramUtils/messageLifecycle.js'

const ctxFor = (chatId) => ({
  chat: { id: chatId },
  reply: vi.fn().mockResolvedValue({ message_id: 50 }),
  telegram: { deleteMessage: vi.fn().mockResolvedValue(true) }
})

describe('messageLifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('borra de forma diferida sin bloquear a quien lo programa', async () => {
    const ctx = ctxFor(1)

    scheduleDeletion(ctx, 10, TTL.STEP)

    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(TTL.STEP)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(1, 10)
  })

  it('reprogramar sustituye al temporizador anterior (sin borrados dobles)', async () => {
    const ctx = ctxFor(2)

    scheduleDeletion(ctx, 10, TTL.STEP)
    await vi.advanceTimersByTimeAsync(TTL.STEP - 1)
    scheduleDeletion(ctx, 10, TTL.INTERFACE)
    await vi.advanceTimersByTimeAsync(TTL.STEP)

    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(TTL.INTERFACE)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledTimes(1)
  })

  it('renovar reinicia la cuenta atrás con el mismo TTL: una interfaz en uso no desaparece', async () => {
    const ctx = ctxFor(3)
    scheduleDeletion(ctx, 10, TTL.INTERFACE)

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(TTL.INTERFACE - 1_000)
      renewDeletion(ctx, 10, TTL.INTERFACE)
    }
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(TTL.INTERFACE)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(3, 10)
  })

  it('renovar un mensaje sin temporizador (p. ej. tras reinicio) aplica el TTL por defecto', async () => {
    const ctx = ctxFor(4)

    renewDeletion(ctx, 10, TTL.INTERFACE)

    await vi.advanceTimersByTimeAsync(TTL.INTERFACE)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(4, 10)
  })

  it('cancelar evita el borrado', async () => {
    const ctx = ctxFor(5)
    scheduleDeletion(ctx, 10, TTL.STEP)

    cancelDeletion(5, 10)

    await vi.advanceTimersByTimeAsync(TTL.STEP * 2)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
  })

  it('borrar ya anula el diferido: el temporizador viejo no vuelve a intentarlo', async () => {
    const ctx = ctxFor(6)
    scheduleDeletion(ctx, 10, TTL.STEP)

    await deleteNow(ctx, 10)
    await vi.advanceTimersByTimeAsync(TTL.STEP)

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledTimes(1)
  })

  it('un fallo de Telegram al borrar no se propaga', async () => {
    const ctx = ctxFor(7)
    ctx.telegram.deleteMessage.mockRejectedValue(
      new Error('message to delete not found')
    )

    scheduleDeletion(ctx, 10, TTL.STEP)

    await expect(vi.advanceTimersByTimeAsync(TTL.STEP)).resolves.not.toThrow()
    await expect(deleteNow(ctx, 11)).resolves.toBeUndefined()
  })

  it('dos usuarios con el mismo message_id no se pisan los temporizadores', async () => {
    const alice = ctxFor(100)
    const bob = ctxFor(200)

    scheduleDeletion(alice, 10, TTL.STEP)
    scheduleDeletion(bob, 10, TTL.INTERFACE)
    cancelDeletion(200, 10)
    await vi.advanceTimersByTimeAsync(TTL.STEP)

    expect(alice.telegram.deleteMessage).toHaveBeenCalledWith(100, 10)
    await vi.advanceTimersByTimeAsync(TTL.INTERFACE)
    expect(bob.telegram.deleteMessage).not.toHaveBeenCalled()
  })

  it('replyTemporary envía y programa su propio borrado', async () => {
    const ctx = ctxFor(8)

    await replyTemporary(ctx, 'hola')

    expect(ctx.reply).toHaveBeenCalledWith('hola', {})
    await vi.advanceTimersByTimeAsync(TTL.NOTICE)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(8, 50)
  })
})
