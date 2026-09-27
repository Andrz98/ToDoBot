import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => {
  const state = { sessions: [] }
  const persistent = vi.fn((ctx, next) => {
    ctx.session = { persisted: true }
    return next()
  })
  const db = {
    get: () => ({
      remove: (predicate) => ({
        write: async () => {
          const removed = state.sessions.filter(predicate)
          state.sessions = state.sessions.filter((s) => !predicate(s))
          return removed
        }
      })
    })
  }
  class LocalSession {
    constructor() {
      this.DB = Promise.resolve(db)
    }
    middleware() {
      return persistent
    }
    static get storageFileAsync() {
      return 'fileAsync'
    }
  }
  return { state, persistent, LocalSession, distinct: vi.fn() }
})
vi.mock('telegraf-session-local', () => ({ default: h.LocalSession }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { distinct: h.distinct }
}))

import {
  localSessionMiddleware,
  pruneUnauthorizedSessions
} from '@/middlewares/session/localSession.js'

describe('localSessionMiddleware', () => {
  beforeEach(() => {
    h.persistent.mockClear()
  })

  it('usuario autorizado: sesión en disco', async () => {
    const ctx = { from: { id: 7 }, state: { authorized: true } }
    const next = vi.fn()

    await localSessionMiddleware(ctx, next)

    expect(h.persistent).toHaveBeenCalled()
    expect(ctx.session).toEqual({ persisted: true })
    expect(next).toHaveBeenCalled()
  })

  it.each([
    ['no autorizado', { authorized: false }],
    ['autorización sin resolver (Mongo caído)', {}]
  ])('%s: sesión efímera, nada llega a session.json', async (_label, state) => {
    const ctx = { from: { id: 666 }, state }
    const next = vi.fn()

    await localSessionMiddleware(ctx, next)

    expect(h.persistent).not.toHaveBeenCalled()
    expect(ctx.session).toEqual({})
    expect(next).toHaveBeenCalled()
  })
})

describe('pruneUnauthorizedSessions', () => {
  it('borra las sesiones de quien no está en AuthorizedUser y conserva el resto', async () => {
    h.state.sessions = [
      { id: '7', data: { flowType: 'add' } },
      { id: '666', data: { flowType: 'timezone' } },
      { id: '667', data: {} }
    ]
    h.distinct.mockResolvedValue([7])

    await expect(pruneUnauthorizedSessions()).resolves.toBe(2)

    expect(h.distinct).toHaveBeenCalledWith('userId')
    expect(h.state.sessions.map((s) => s.id)).toEqual(['7'])
  })
})
