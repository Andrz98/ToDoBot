import { describe, it, expect, vi, afterEach } from 'vitest'

const h = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = '123456:test-token'
  process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret_123'
  return { use: vi.fn(), on: vi.fn(), session: (_ctx, next) => next() }
})
vi.mock('@/config/telegraf/botFactory.js', () => ({
  createBot: () => ({
    use: h.use,
    command: vi.fn(),
    start: vi.fn(),
    on: h.on,
    action: vi.fn(),
    catch: vi.fn(),
    webhookCallback: vi.fn(),
    telegram: {}
  })
}))
vi.mock('@/middlewares/session/localSession.js', () => ({
  localSessionMiddleware: h.session
}))

import '@/config/telegraf/telegraf.js'
import { rateLimit } from '@/middlewares/secure/rateLimit.js'
import { flowGuard } from '@/middlewares/flowControl/flowGuard.js'

// clearMocks vacía mock.calls antes de cada test: se calcula una sola vez tras cargar telegraf.js
const order = h.use.mock.calls.map(([mw]) => mw)
const onCalls = [...h.on.mock.calls]

describe('orden de middlewares globales', () => {
  it('la sesión se carga antes de rateLimit (sus exenciones por flujo la necesitan)', () => {
    expect(order.indexOf(h.session)).toBeGreaterThanOrEqual(0)
    expect(order.indexOf(h.session)).toBeLessThan(order.indexOf(rateLimit))
  })

  it('flowGuard va después de la sesión', () => {
    expect(order.indexOf(flowGuard)).toBeGreaterThan(order.indexOf(h.session))
  })
})

describe('DEBUG=true: trazas globales sin datos de usuario', () => {
  const SECRET = 'DATO-PRIVADO-123'
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('el middleware de depuración previo a flowGuard no vuelca mensaje ni sesión', async () => {
    vi.stubEnv('DEBUG', 'true')
    const captured = []
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      captured.push(JSON.stringify(args))
    })
    const debugMw = order[order.indexOf(flowGuard) - 1]
    const next = vi.fn()

    await debugMw(
      {
        updateType: 'message',
        message: { text: SECRET },
        session: { flowType: 'add', pendingTask: { name: SECRET } }
      },
      next
    )

    expect(log).toHaveBeenCalled()
    expect(captured.join(' | ')).not.toContain(SECRET)
    expect(next).toHaveBeenCalled()
  })

  it('los handlers globales de mensaje no registran el texto', async () => {
    vi.stubEnv('DEBUG', 'true')
    const captured = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      captured.push(JSON.stringify(args))
    })

    for (const [event, handler] of onCalls) {
      if (event !== 'message') {
        continue
      }
      await handler({ message: { text: SECRET }, session: {} }, vi.fn())
    }

    expect(captured.join(' | ')).not.toContain(SECRET)
  })
})
