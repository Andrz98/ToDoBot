import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({ config: vi.fn() }))
vi.mock('dotenv', () => ({ default: { config: h.config } }))
// test/setup.js sustituye env.js en todos los tests; aquí se prueba el real
vi.unmock('@/config/env.js')

describe('config/env', () => {
  it('carga .env en modo silencioso (dotenv >= 17 imprime un mensaje en cada arranque)', async () => {
    await import('@/config/env.js')

    expect(h.config).toHaveBeenCalledWith({ quiet: true })
  })
})
