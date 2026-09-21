import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../support/telegram.js'

const h = vi.hoisted(() => ({ findById: vi.fn(), tz: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { registerForceReplyHandler } from '@/events/editForceReply/editForceReplyHandler.js'

const editCtx = (awaiting, text) =>
  makeCtx({
    message: { text },
    session: {
      flowType: 'edit',
      awaiting,
      editing: { id: 't1', oldName: 'Pagar luz' },
      edits: {}
    }
  })

describe('/edit: respuestas de texto', () => {
  let bot, task
  beforeEach(() => {
    task = {
      name: 'Pagar luz',
      description: 'urgente',
      reminderAt: new Date('2099-01-01T00:00:00Z')
    }
    h.findById.mockReset().mockResolvedValue(task)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    bot = makeFakeBot()
    registerForceReplyHandler(bot)
  })

  it('aplica un nuevo nombre y ofrece guardar', async () => {
    const ctx = editCtx('new_name', 'Pagar gas')

    await bot.say(ctx)

    expect(task.name).toBe('Pagar gas')
    expect(ctx.session.awaiting).toBeNull()
    expect(ctx.reply).toHaveBeenCalledTimes(2)
  })

  it('interpreta la nueva fecha en la zona horaria del usuario', async () => {
    h.tz.mockResolvedValue('America/Bogota')
    const ctx = editCtx('new_date', '25/12/2099 10:00')

    await bot.say(ctx)

    expect(task.reminderAt.toISOString()).toBe('2099-12-25T15:00:00.000Z')
  })

  it('una fecha pasada avisa y mantiene el flujo de edición', async () => {
    const ctx = editCtx('new_date', '01/01/2000 10:00')

    await bot.say(ctx)

    expect(ctx.reply).toHaveBeenCalledWith('⌚ La nueva fecha debe ser futura.')
    expect(ctx.session.editing).toEqual({ id: 't1', oldName: 'Pagar luz' })
    expect(ctx.session.awaiting).toBe('new_date')
    expect(ctx.session.flowType).toBe('edit')
  })
})
