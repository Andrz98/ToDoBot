import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { isAuthorizedUser } from '@/middlewares/access/isAuthorizedUser.js'

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
