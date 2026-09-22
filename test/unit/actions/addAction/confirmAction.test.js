import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ Task: vi.fn(), save: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: h.Task }))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: vi.fn() }))

import { registerConfirmAction } from '@/actions/addAction/confirmAction.js'

const REMINDER = new Date('2099-12-25T15:00:00Z')

describe('/add: confirmar creación', () => {
  let bot, ctx
  beforeEach(() => {
    h.save.mockReset().mockResolvedValue(undefined)
    h.Task.mockReset().mockImplementation(function (data) {
      return { ...data, save: h.save }
    })
    bot = makeFakeBot()
    registerConfirmAction(bot)
    ctx = makeCtx({
      session: {
        flowType: 'add',
        pendingTask: { name: 'Pagar luz', reminderAt: REMINDER },
        menuMessageId: 10
      }
    })
  })

  it('guarda la tarea, borra el menú y limpia la sesión', async () => {
    await bot.press('add_confirm', ctx)

    expect(h.Task).toHaveBeenCalledWith({
      userId: 7,
      name: 'Pagar luz',
      description: '(sin descripción)',
      frequency: 'daily',
      reminderAt: REMINDER
    })
    expect(h.save).toHaveBeenCalled()
    expect(ctx.deleteMessage).toHaveBeenCalled()
    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.pendingTask).toBeUndefined()
  })

  it('con la sesión perdida avisa en vez de lanzar TypeError', async () => {
    ctx.session = {}

    await expect(bot.press('add_confirm', ctx)).resolves.not.toThrow()

    expect(h.Task).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      expect.stringContaining('/add'),
      { show_alert: true }
    )
  })

  it('con un nombre duplicado (E11000) avisa y conserva menú y sesión', async () => {
    h.save.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }))

    await expect(bot.press('add_confirm', ctx)).resolves.not.toThrow()

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      expect.stringContaining('/clear'),
      { show_alert: true }
    )
    expect(ctx.deleteMessage).not.toHaveBeenCalled()
    expect(ctx.session.pendingTask).toEqual({
      name: 'Pagar luz',
      reminderAt: REMINDER
    })
  })

  it('un error de guardado inesperado se propaga a bot.catch', async () => {
    h.save.mockRejectedValue(new Error('db caída'))

    await expect(bot.press('add_confirm', ctx)).rejects.toThrow('db caída')
    expect(ctx.deleteMessage).not.toHaveBeenCalled()
  })
})
