import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ exists: vi.fn() }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { exists: h.exists }
}))

import { isUserAuthorized } from '@/helpers/userAuthorizedTaskController/isUserAuthorized.js'

describe('isUserAuthorized', () => {
  beforeEach(() => h.exists.mockReset())

  it('consulta AuthorizedUser por el id numérico de Telegram', async () => {
    h.exists.mockResolvedValue({ _id: 'x' })

    await expect(isUserAuthorized({ from: { id: 7 } })).resolves.toBe(true)
    expect(h.exists).toHaveBeenCalledWith({ userId: 7 })
  })

  it('sin from.id no está autorizado', async () => {
    await expect(isUserAuthorized({})).resolves.toBe(false)
    expect(h.exists).not.toHaveBeenCalled()
  })

  it('reutiliza lo que resolvió resolveAuthorization en el mismo update', async () => {
    const revoked = { from: { id: 7 }, state: { authorized: false } }

    await expect(isUserAuthorized(revoked)).resolves.toBe(false)
    expect(h.exists).not.toHaveBeenCalled()
  })
})
