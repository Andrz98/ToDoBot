import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleUserAuth } from '@/controllers/authController/authController.js'
import { AuthorizedUser } from '@/models/authorizedUser.js' // Asegúrate de usar la ruta exacta (minúscula si aplica)

// Primero creo el Mock explícito del modelo AuthorizedUser
vi.mock('@/models/authorizedUser.js', () => {
  const findOne = vi.fn()
  const constructorMock = vi.fn(() => ({ save: vi.fn() }))

  return {
    AuthorizedUser: Object.assign(constructorMock, { findOne })
  }
})

// Después describo el usuario que pasará los test
describe('handleUserAuth', () => {
  const userId = 12345
  const username = 'Andrés'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe registrar el usuario nuevo si no existe', async () => {
    AuthorizedUser.findOne.mockResolvedValue(null)

    // Mock del método save sobre la nueva instancia
    const saveMock = vi.fn()

    AuthorizedUser.mockImplementation(() => ({ save: saveMock }))

    const result = await handleUserAuth(userId, username)

    expect(AuthorizedUser.findOne).toHaveBeenCalledWith({ userId })
    expect(saveMock).toHaveBeenCalled()
    expect(result.status).toBe('new')
    expect(result.message).toContain(username)
  })

  it('debe actualizar el nombre del usuario si ya existe', async () => {
    const saveMock = vi.fn()
    const existingUser = { username: 'olduser', save: saveMock }

    AuthorizedUser.findOne.mockResolvedValue(existingUser)

    const result = await handleUserAuth(userId, username)

    expect(existingUser.username).toBe(username)
    expect(saveMock).toHaveBeenCalled()
    expect(result.status).toBe('existing')
    expect(result.message).toContain(username)
  })

  it('debe retornar status error si ocurre un fallo', async () => {
    AuthorizedUser.findOne.mockRejectedValue(new Error('DB failure'))

    const result = await handleUserAuth(userId, username)

    expect(result.status).toBe('error')
    expect(result.message).toContain('error')
  })
})
