import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({ config: vi.fn() }))
vi.mock('dotenv', () => ({ default: { config: h.config } }))

describe('config/env', () => {
  it('carga .env en modo silencioso (dotenv >= 17 imprime un mensaje en cada arranque)', async () => {
    await import('@/config/env.js')

    expect(h.config).toHaveBeenCalledWith({ quiet: true })
  })
})
