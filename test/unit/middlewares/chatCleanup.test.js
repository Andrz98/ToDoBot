import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({ menu: vi.fn() }))
vi.mock('@/helpers/menu/mainMenu.js', () => ({ sendMainMenu: h.menu }))

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
  beforeEach(() => {
    vi.useFakeTimers()
    h.menu.mockReset().mockResolvedValue(undefined)
  })
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

  describe('el usuario solo escribe cuando un botón se lo pide', () => {
    it('un texto que nadie ha pedido se borra en el acto y no llega a ningún handler', async () => {
      const ctx = baseCtx({
        message: { text: 'Comprar pan', message_id: 32 },
        session: {}
      })
      const next = vi.fn()

      await chatCleanup(ctx, next)

      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(9, 32)
      expect(next).not.toHaveBeenCalled()
    })

    it('también se borra si hay un flujo abierto que no espera texto', async () => {
      const ctx = baseCtx({
        message: { text: 'hola', message_id: 33 },
        session: { flowType: 'clear', awaiting: null }
      })
      const next = vi.fn()

      await chatCleanup(ctx, next)

      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(9, 33)
      expect(next).not.toHaveBeenCalled()
    })

    it('cualquier otro mensaje (foto, sticker, voz…) se borra igual', async () => {
      const ctx = baseCtx({
        message: { photo: [{}], message_id: 34 },
        session: {}
      })

      await chatCleanup(ctx, vi.fn())

      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(9, 34)
    })

    it('si un botón pidió texto (awaiting), pasa al flujo y no se borra de golpe', async () => {
      const ctx = baseCtx({
        message: { text: 'Comprar pan', message_id: 35 },
        session: { flowType: 'add', awaiting: 'add_name' }
      })
      const next = vi.fn()

      await chatCleanup(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    })

    it('un comando sigue su camino aunque no se espere texto', async () => {
      const ctx = baseCtx({
        message: { text: '/list', message_id: 36 },
        session: {}
      })
      const next = vi.fn()

      await chatCleanup(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('las pulsaciones de botón (sin message) no se ven afectadas', async () => {
      const ctx = baseCtx({
        callbackQuery: { message: { message_id: 40 } },
        session: {}
      })
      const next = vi.fn()

      await chatCleanup(ctx, next)

      expect(next).toHaveBeenCalled()
    })
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

  it('pulsar el menú principal no le pone plazo de borrado: no caduca', async () => {
    const ctx = baseCtx({
      callbackQuery: { message: { message_id: 40 } },
      session: { startMessageId: 40 }
    })

    await chatCleanup(ctx, vi.fn())

    await vi.advanceTimersByTimeAsync(TTL.INTERFACE * 2)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
  })

  describe('menú principal al terminar un flujo', () => {
    it('si el flujo termina, el usuario recupera el menú', async () => {
      const ctx = baseCtx({ session: { flowType: 'clear' } })

      await chatCleanup(ctx, async () => {
        ctx.session.flowType = null
      })

      expect(h.menu).toHaveBeenCalledWith(ctx)
    })

    it('si el flujo sigue activo, no lo reenvía', async () => {
      const ctx = baseCtx({ session: { flowType: 'add' } })

      await chatCleanup(ctx, vi.fn())

      expect(h.menu).not.toHaveBeenCalled()
    })

    it('sin flujo previo (p. ej. /list) no lo reenvía', async () => {
      const ctx = baseCtx({ session: {} })

      await chatCleanup(ctx, vi.fn())

      expect(h.menu).not.toHaveBeenCalled()
    })

    it('si el propio handler ya envió el menú (/start), no lo duplica', async () => {
      const ctx = baseCtx({ session: { flowType: 'add', startMessageId: 1 } })

      await chatCleanup(ctx, async () => {
        ctx.session.flowType = null
        ctx.session.startMessageId = 2
      })

      expect(h.menu).not.toHaveBeenCalled()
    })

    it('si reenviar el menú falla, el bot sigue', async () => {
      h.menu.mockRejectedValue(new Error('boom'))
      const ctx = baseCtx({ session: { flowType: 'clear' } })

      await expect(
        chatCleanup(ctx, async () => {
          ctx.session.flowType = null
        })
      ).resolves.toBeUndefined()
    })
  })
})
