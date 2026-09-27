import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => {
  const docs = new Map()
  return {
    docs,
    distinct: vi.fn(),
    Session: {
      findById: vi.fn((id) => ({
        lean: async () =>
          docs.has(id) ? { _id: id, data: docs.get(id) } : null
      })),
      updateOne: vi.fn(async ({ _id }, { data }) => {
        docs.set(_id, data)
      }),
      deleteOne: vi.fn(async ({ _id }) => {
        docs.delete(_id)
      }),
      deleteMany: vi.fn(async ({ _id: { $nin } }) => {
        let deletedCount = 0
        for (const id of [...docs.keys()]) {
          if (!$nin.includes(id)) {
            docs.delete(id)
            deletedCount++
          }
        }
        return { deletedCount }
      })
    }
  }
})
vi.mock('@/models/session.js', () => ({ Session: h.Session }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { distinct: h.distinct }
}))

import {
  localSessionMiddleware,
  pruneUnauthorizedSessions
} from '@/middlewares/session/localSession.js'

let updateId = 0
const makeCtx = (id, state) => ({
  update: { update_id: ++updateId },
  from: { id },
  state
})

describe('localSessionMiddleware', () => {
  beforeEach(() => {
    h.docs.clear()
  })

  it('usuario autorizado: carga su sesión de Mongo y guarda los cambios', async () => {
    h.docs.set('7', { flowType: 'add' })
    const ctx = makeCtx(7, { authorized: true })

    await localSessionMiddleware(ctx, async () => {
      expect(ctx.session).toEqual({ flowType: 'add' })
      ctx.session.awaiting = 'new_name'
    })

    expect(h.Session.findById).toHaveBeenCalledWith('7')
    expect(h.docs.get('7')).toEqual({ flowType: 'add', awaiting: 'new_name' })
  })

  it('usuario autorizado sin sesión previa: empieza con {}', async () => {
    const ctx = makeCtx(8, { authorized: true })

    await localSessionMiddleware(ctx, async () => {
      expect(ctx.session).toEqual({})
      ctx.session.flowType = 'timezone'
    })

    expect(h.docs.get('8')).toEqual({ flowType: 'timezone' })
  })

  it.each([
    ['no autorizado', { authorized: false }],
    ['autorización sin resolver (Mongo caído)', {}]
  ])('%s: sesión efímera, nada llega a Mongo', async (_label, state) => {
    const ctx = makeCtx(666, state)
    const next = vi.fn(() => {
      ctx.session.flowType = 'add'
    })

    await localSessionMiddleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.session).toEqual({ flowType: 'add' })
    expect(h.Session.findById).not.toHaveBeenCalled()
    expect(h.Session.updateOne).not.toHaveBeenCalled()
  })
})

describe('pruneUnauthorizedSessions', () => {
  it('borra las sesiones de quien no está en AuthorizedUser y conserva el resto', async () => {
    h.docs.clear()
    h.docs.set('7', { flowType: 'add' })
    h.docs.set('666', { flowType: 'timezone' })
    h.docs.set('667', {})
    h.distinct.mockResolvedValue([7])

    await expect(pruneUnauthorizedSessions()).resolves.toBe(2)

    expect(h.distinct).toHaveBeenCalledWith('userId')
    expect([...h.docs.keys()]).toEqual(['7'])
  })
})
