import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TTL } from '@/utils/telegramUtils/messageLifecycle.js'
import {
  openInterface,
  renderInterface,
  askInput
} from '@/utils/telegramUtils/flowMessages.js'

const ctxFor = (session) => ({
  chat: { id: 1 },
  session,
  reply: vi.fn().mockResolvedValue({ message_id: 50 }),
  telegram: {
    editMessageText: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true)
  }
})

describe('vida del flujo (flowExpiresAt): un flujo activo no debe caducar bajo el usuario', () => {
  beforeEach(() => vi.useFakeTimers())

  it('abrir una interfaz nueva arma flowExpiresAt a 10 min', async () => {
    const ctx = ctxFor({ flowType: 'add' })

    await openInterface(ctx, 'hola')

    expect(ctx.session.flowExpiresAt).toBe(Date.now() + TTL.INTERFACE)
  })

  it('repintar la interfaz existente renueva flowExpiresAt', async () => {
    const ctx = ctxFor({ flowType: 'edit', menuMessageId: 5 })

    await renderInterface(ctx, 'hola')
    await vi.advanceTimersByTimeAsync(60_000)
    await renderInterface(ctx, 'de nuevo')

    expect(ctx.session.flowExpiresAt).toBe(Date.now() + TTL.INTERFACE)
  })

  it('pedir un dato con force-reply también renueva flowExpiresAt', async () => {
    const ctx = ctxFor({ flowType: 'add' })

    await askInput(ctx, 'Escribe algo:')

    expect(ctx.session.flowExpiresAt).toBe(Date.now() + TTL.INTERFACE)
  })

  it('una interfaz sin flujo asociado (p. ej. /list) no toca flowExpiresAt', async () => {
    const ctx = ctxFor({})

    await openInterface(ctx, 'hola')

    expect(ctx.session.flowExpiresAt).toBeUndefined()
  })
})
