import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ auth: vi.fn(), tz: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { startCommand } from '@/controllers/startController/startController.js'

describe('startCommand', () => {
  beforeEach(() => {
    h.auth.mockReset().mockResolvedValue(true)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  // Parte 1: Debe responder con un mensaje de bienvenida
  it('responde con un mensaje de bienvenida', async () => {
    const mockReply = vi.fn()
    const mockCtx = {
      from: { id: 123, username: 'andres:dev' },
      reply: mockReply
    }

    await startCommand(mockCtx)

    expect(mockReply).toHaveBeenCalledWith(expect.stringContaining('Hola'), {
      parse_mode: 'HTML'
    })
  })

  it('escapa el HTML del nombre del usuario (parse_mode HTML)', async () => {
    const mockCtx = {
      from: { id: 7, first_name: 'Tom <&> Jerry' },
      reply: vi.fn()
    }

    await startCommand(mockCtx)

    expect(mockCtx.reply.mock.calls[0][0]).toContain(
      '¡Hola, Tom &lt;&amp;&gt; Jerry!'
    )
  })

  it('a un usuario no autorizado le indica cómo pedir acceso', async () => {
    h.auth.mockResolvedValue(false)
    const mockCtx = { from: { id: 9, username: 'intruso' }, reply: vi.fn() }

    await startCommand(mockCtx)

    expect(mockCtx.reply.mock.calls[0][0]).toContain('No estás autorizad')
  })

  // Parte 2: Maneja los errores sin romper el bot
  it('maneja los errores sin romper el bot', async () => {
    const mockCtx = { from: null, reply: vi.fn() }

    await expect(startCommand(mockCtx)).resolves.not.toThrow()
    expect(mockCtx.reply).toHaveBeenCalledWith(
      '😵 Ocurrieron problemas al procesar el comando. Inténtalo más tarde.',
      { parse_mode: 'HTML' }
    )
  })
})
