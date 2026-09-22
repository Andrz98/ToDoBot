import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ Task: vi.fn(), save: vi.fn(), auth: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: h.Task }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: vi.fn().mockResolvedValue('Europe/Madrid') })
)
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerConfirmAction } from '@/actions/addAction/confirmAction.js'

const REMINDER = new Date('2099-12-25T15:00:00Z')

describe('/add: confirmar creación', () => {
  let bot, ctx
  beforeEach(() => {
    h.save.mockReset().mockResolvedValue(undefined)
    h.Task.mockReset().mockImplementation(function (data) {
      return { ...data, save: h.save }
    })
    h.auth.mockReset().mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerConfirmAction(bot)
    ctx = makeCtx({
      session: {
        flowType: 'add',
        pendingTask: { name: 'Pagar luz', reminderAt: REMINDER },
        menuMessageId: 5
      }
    })
  })

  it('guarda la tarea, resume el resultado en el menú y limpia la sesión', async () => {
    await bot.press('add_confirm', ctx)

    expect(h.Task).toHaveBeenCalledWith({
      userId: 7,
      name: 'Pagar luz',
      description: '(sin descripción)',
      frequency: 'daily',
      reminderAt: REMINDER
    })
    expect(h.save).toHaveBeenCalled()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Pagar luz'),
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
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
    expect(ctx.editMessageText).not.toHaveBeenCalled()
    expect(ctx.session.pendingTask).toEqual({
      name: 'Pagar luz',
      reminderAt: REMINDER
    })
  })

  it('un error de guardado inesperado limpia la sesión en vez de dejarla colgada', async () => {
    h.save.mockRejectedValue(new Error('db caída'))

    await expect(bot.press('add_confirm', ctx)).resolves.not.toThrow()

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.pendingTask).toBeUndefined()
  })

  it('usuario desautorizado a mitad de flujo: no crea la tarea', async () => {
    h.auth.mockResolvedValue(false)

    await bot.press('add_confirm', ctx)

    expect(h.Task).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
  })
})
