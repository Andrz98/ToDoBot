import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import {
  isAuthorizedUser,
  resolveAuthorization
} from '@/middlewares/access/isAuthorizedUser.js'

describe('resolveAuthorization', () => {
  const ctxFor = (extra = {}) => ({
    from: { id: 1 },
    state: {},
    answerCbQuery: vi.fn().mockResolvedValue(true),
    ...extra
  })
  beforeEach(() => {
    h.auth.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('autorizado: lo deja en ctx.state y continúa', async () => {
    h.auth.mockResolvedValue(true)
    const ctx = ctxFor({ callbackQuery: { data: 'list_page_0' } })
    const next = vi.fn()

    await resolveAuthorization(ctx, next)

    expect(ctx.state.authorized).toBe(true)
    expect(next).toHaveBeenCalled()
  })

  it('no autorizado pulsando un botón: se rechaza antes de cualquier handler', async () => {
    h.auth.mockResolvedValue(false)
    const ctx = ctxFor({ callbackQuery: { data: 'saveReminder::id::weekly' } })
    const next = vi.fn()

    await resolveAuthorization(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
  })

  it('no autorizado con un mensaje: continúa (cada comando responde) y queda marcado', async () => {
    h.auth.mockResolvedValue(false)
    const ctx = ctxFor({ message: { text: '/start' } })
    const next = vi.fn()

    await resolveAuthorization(ctx, next)

    expect(ctx.state.authorized).toBe(false)
    expect(next).toHaveBeenCalled()
  })

  it('si Mongo falla: un botón se rechaza con error genérico (falla cerrado)', async () => {
    h.auth.mockRejectedValue(new Error('db'))
    const ctx = ctxFor({ callbackQuery: { data: 'x' } })
    const next = vi.fn()

    await resolveAuthorization(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
  })

  it('si Mongo falla con un mensaje: no decide, continúa sin marcar', async () => {
    h.auth.mockRejectedValue(new Error('db'))
    const ctx = ctxFor({ message: { text: '/list' } })
    const next = vi.fn()

    await resolveAuthorization(ctx, next)

    expect(ctx.state.authorized).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })
})

describe('isAuthorizedUser', () => {
  let ctx
  beforeEach(() => {
    h.auth.mockReset()
    ctx = { reply: vi.fn().mockResolvedValue(undefined) }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('usuario autorizado: continúa y devuelve la promesa de next()', async () => {
    h.auth.mockResolvedValue(true)
    const next = vi.fn().mockResolvedValue('hecho')

    await expect(isAuthorizedUser(ctx, next)).resolves.toBe('hecho')
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('un error posterior en la cadena se propaga (no se disfraza de error de autorización)', async () => {
    h.auth.mockResolvedValue(true)
    const next = vi.fn().mockRejectedValue(new Error('boom'))

    await expect(isAuthorizedUser(ctx, next)).rejects.toThrow('boom')
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('usuario no autorizado: responde y no continúa', async () => {
    h.auth.mockResolvedValue(false)
    const next = vi.fn()

    await isAuthorizedUser(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('si falla la comprobación responde error interno y no continúa', async () => {
    h.auth.mockRejectedValue(new Error('db'))
    const next = vi.fn()

    await isAuthorizedUser(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('😵‍💫 Error interno de autorización.')
    expect(next).not.toHaveBeenCalled()
  })
})
