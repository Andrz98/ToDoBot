import { describe, it, expect, vi } from 'vitest'

// Mockeo el helper
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: vi.fn(() => Promise.resolve(true))
}))

import { startCommand } from '../../../../controllers/startController/startController.js'

describe('startCommand', () => {
  // Parte 1: Debe responder con un mensaje de bienvenida
  it('responde con un mensaje de bienvenida', async () => {
    const mockReply = vi.fn()
    const mockCtx = {
      from: { id: 123, username: 'andres:dev' },
      reply: mockReply
    }

    // Llamo la función real
    await startCommand(mockCtx)

    // Valido que la lógica llame correctamente al mensaje
    expect(mockReply).toHaveBeenCalledWith(expect.stringContaining('Hola'))
  })

  // Parte 2: Maneja los errores sin romper el bot
  it('maneja los errores sin romper el bot', async () => {
    const mockCtx = {
      from: null,
      reply: vi.fn()
    }

    // Llamo la función real
    await expect(startCommand(mockCtx)).resolves.not.toThrow()
  })
})
