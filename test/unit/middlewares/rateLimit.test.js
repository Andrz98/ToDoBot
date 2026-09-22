import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// El módulo guarda estado en un Map: se reimporta en cada test para partir de cero
const load = async () => {
  vi.resetModules()
  return (await import('@/middlewares/secure/rateLimit.js')).rateLimit
}

const ctxFor = (id, extra = {}) => ({
  from: { id },
  message: { text: 'hola' },
  session: {},
  reply: vi.fn().mockResolvedValue(undefined),
  ...extra
})

const act = async (rateLimit, ctx) => {
  const next = vi.fn().mockResolvedValue(undefined)
  await rateLimit(ctx, next)
  return next
}

describe('rateLimit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('permite 5 acciones en la ventana y bloquea la 6ª', async () => {
    const rateLimit = await load()
    for (let i = 0; i < 5; i++) {
      expect(await act(rateLimit, ctxFor(1))).toHaveBeenCalled()
    }

    const ctx = ctxFor(1)
    const next = await act(rateLimit, ctx)

    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply.mock.calls[0][0]).toContain('más de 5 acciones en 7 s')
  })

  it('vuelve a permitir cuando pasa la ventana de 7 s', async () => {
    const rateLimit = await load()
    for (let i = 0; i < 5; i++) {
      await act(rateLimit, ctxFor(1))
    }
    vi.advanceTimersByTime(7001)

    expect(await act(rateLimit, ctxFor(1))).toHaveBeenCalled()
  })

  it('cuenta por usuario', async () => {
    const rateLimit = await load()
    for (let i = 0; i < 5; i++) {
      await act(rateLimit, ctxFor(1))
    }

    expect(await act(rateLimit, ctxFor(2))).toHaveBeenCalled()
  })

  it('no limita callbacks, flujos activos ni respuestas esperadas', async () => {
    const rateLimit = await load()
    for (let i = 0; i < 10; i++) {
      const callback = ctxFor(1, { callbackQuery: { data: 'x' } })
      const inFlow = ctxFor(1, { session: { flowType: 'add' } })
      const awaited = ctxFor(1, { session: { awaiting: 'add_name' } })
      expect(await act(rateLimit, callback)).toHaveBeenCalled()
      expect(await act(rateLimit, inFlow)).toHaveBeenCalled()
      expect(await act(rateLimit, awaited)).toHaveBeenCalled()
    }
  })

  it('sin from.id deja pasar', async () => {
    const rateLimit = await load()

    expect(
      await act(rateLimit, ctxFor(undefined, { from: {} }))
    ).toHaveBeenCalled()
  })

  it('barre a los usuarios inactivos para que el Map no crezca sin límite', async () => {
    const rateLimit = await load()
    const remove = vi.spyOn(Map.prototype, 'delete')
    for (let id = 1; id <= 5; id++) {
      await act(rateLimit, ctxFor(id))
    }

    vi.advanceTimersByTime(14_000)

    expect(remove).toHaveBeenCalledTimes(5)
  })
})
