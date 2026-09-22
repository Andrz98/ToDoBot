import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ findOne: vi.fn() }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { findOne: h.findOne }
}))

import { setTimezone } from '@/controllers/timeZoneController/setTimezone.js'

describe('/settimezone', () => {
  let ctx
  beforeEach(() => {
    h.findOne.mockReset().mockResolvedValue({ timezone: 'Europe/Madrid' })
    ctx = makeCtx({ message: { text: '/settimezone' } })
  })

  it('sin argumento: abre el flujo "timezone" y muestra el menú', async () => {
    await setTimezone(ctx)

    expect(ctx.session.flowType).toBe('timezone')
    expect(ctx.session.pendingTz).toBeNull()
    expect(ctx.reply.mock.calls[0][0]).toBe('Selecciona tu zona horaria:')
  })

  it('con argumento válido: abre el flujo "timezone" y pide confirmación', async () => {
    ctx.message.text = '/settimezone America/Bogota'

    await setTimezone(ctx)

    expect(ctx.session.flowType).toBe('timezone')
    expect(ctx.session.pendingTz).toBe('America/Bogota')
    expect(ctx.reply.mock.calls[0][0]).toBe(
      '¿Estás segur@ de cambiar tu zona horaria a <b>America/Bogota</b>?'
    )
  })

  it('autocura un flowType obsoleto de otro flujo abandonado (con argumento)', async () => {
    ctx.session.flowType = 'add'
    ctx.message.text = '/settimezone America/Bogota'

    await setTimezone(ctx)

    expect(ctx.session.flowType).toBe('timezone')
  })

  it('con argumento inválido: no toca la sesión', async () => {
    ctx.message.text = '/settimezone Marte/Central'

    await setTimezone(ctx)

    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.pendingTz).toBeUndefined()
    expect(ctx.reply.mock.calls[0][0]).toContain('Zona horaria no válida')
  })

  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    h.findOne.mockRejectedValue(new Error('Fallo inesperado'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await setTimezone(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al procesar tu zona horaria.',
      {}
    )
  })
})
