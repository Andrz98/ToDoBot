import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn(), count: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock('@/models/task.js', () => ({ Task: { countDocuments: h.count } }))

import { clearTask } from '@/controllers/taskControllers/clearTask.js'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('/clear', () => {
  let ctx
  beforeEach(() => {
    h.auth.mockReset().mockResolvedValue(true)
    h.count.mockReset().mockResolvedValue(3)
    ctx = makeCtx({ message: { text: '/clear' } })
  })

  it('genera un token UUID v4 y lo liga a los botones de confirmación', async () => {
    await clearTask(ctx)

    const token = ctx.session.pendingClearToken
    expect(token).toMatch(UUID_V4)
    const callbacks = ctx.reply.mock.calls[0][1].reply_markup.inline_keyboard
      .flat()
      .map((b) => b.callback_data)
    expect(callbacks).toEqual([
      `clear_confirm_${token}:yes`,
      `clear_confirm_${token}:no`
    ])
  })

  it('sin tareas no abre confirmación', async () => {
    h.count.mockResolvedValue(0)

    await clearTask(ctx)

    expect(ctx.session.pendingClearToken).toBeUndefined()
    expect(ctx.reply.mock.calls[0][0]).toContain('No tienes tareas')
  })

  it('usuario no autorizado: responde y no consulta tareas', async () => {
    h.auth.mockResolvedValue(false)

    await clearTask(ctx)

    expect(h.count).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })
})
