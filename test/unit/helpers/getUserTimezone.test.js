import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ findOne: vi.fn() }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { findOne: h.findOne }
}))

import { getUserTimezone } from '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'

const userWith = (timezone) =>
  h.findOne.mockReturnValue({ lean: () => Promise.resolve({ timezone }) })

describe('getUserTimezone', () => {
  beforeEach(() => h.findOne.mockReset())

  it('devuelve la zona guardada si está en la lista blanca', async () => {
    userWith('America/Bogota')

    await expect(getUserTimezone('7')).resolves.toBe('America/Bogota')
    expect(h.findOne).toHaveBeenCalledWith({ userId: 7 }, 'timezone')
  })

  it('cae a Europe/Madrid si la zona guardada no es válida', async () => {
    userWith('Asia/Tokyo')

    await expect(getUserTimezone(7)).resolves.toBe('Europe/Madrid')
  })

  it('lanza si el usuario no existe', async () => {
    h.findOne.mockReturnValue({ lean: () => Promise.resolve(null) })

    await expect(getUserTimezone(7)).rejects.toThrow('User 7 not found')
  })
})
