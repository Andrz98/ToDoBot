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
  it('responde con la bienvenida, /reminder incluido, y el menú de botones', async () => {
    const mockReply = vi.fn()
    const mockCtx = {
      from: { id: 123, username: 'andres:dev' },
      reply: mockReply
    }

    await startCommand(mockCtx)

    const [text, extra] = mockReply.mock.calls[0]
    expect(text).toContain('Hola')
    expect(text).toContain('/reminder')
    expect(extra.parse_mode).toBe('HTML')
    expect(
      extra.reply_markup.inline_keyboard.flat().map((b) => b.callback_data)
    ).toContain('menu_reminder')
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

    expect(mockCtx.reply.mock.calls[0][0]).toContain('Debes estar autorizado')
    expect(h.tz).not.toHaveBeenCalled()
  })

  it('sin ctx.from (no autorizado): no revienta, responde el mensaje de no autorizado', async () => {
    h.auth.mockResolvedValue(false)
    const mockCtx = { from: null, reply: vi.fn() }

    await expect(startCommand(mockCtx)).resolves.not.toThrow()
    expect(mockCtx.reply.mock.calls[0][0]).toContain('Debes estar autorizado')
    expect(h.tz).not.toHaveBeenCalled()
  })

  // Parte 2: Maneja los errores sin romper el bot
  it('maneja los errores sin romper el bot', async () => {
    h.tz.mockRejectedValue(new Error('boom'))
    const mockCtx = { from: { id: 1 }, reply: vi.fn() }

    await expect(startCommand(mockCtx)).resolves.not.toThrow()
    expect(mockCtx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrieron problemas al procesar el comando. Inténtalo más tarde.',
      { parse_mode: 'HTML' }
    )
  })
})
