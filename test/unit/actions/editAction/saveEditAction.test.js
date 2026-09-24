import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ findById: vi.fn(), auth: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerSaveEditAction } from '@/actions/editAction/saveEditAction.js'

const editCtx = (edits) =>
  makeCtx({
    session: {
      flowType: 'edit',
      editing: { id: 't1', oldName: 'Pagar luz' },
      edits,
      timezone: 'Europe/Madrid',
      menuMessageId: 5
    }
  })

describe('/edit: guardar (edit_save)', () => {
  let bot, task
  beforeEach(() => {
    task = {
      name: 'Pagar luz',
      description: 'urgente',
      reminderAt: new Date('2099-01-01T00:00:00Z'),
      save: vi.fn().mockResolvedValue(undefined)
    }
    h.findById.mockReset().mockResolvedValue(task)
    h.auth.mockReset().mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerSaveEditAction(bot)
  })

  it('guarda los cambios, resume el resultado en el menú y limpia la sesión', async () => {
    const ctx = editCtx({ newName: 'Pagar gas' })

    await bot.press('edit_save', ctx)

    expect(task.name).toBe('Pagar gas')
    expect(task.save).toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('👌🏽 Tarea editada', {})
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Pagar gas'),
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.editing).toBeUndefined()
  })

  it('cambiar la fecha retira el aviso vivo y reinicia las alertas', async () => {
    task.userId = 7
    task.reminderMessageId = 77
    task.alertsSent = ['24h']
    const ctx = editCtx({ date: '2099-06-01T00:00:00.000Z' })

    await bot.press('edit_save', ctx)

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 77)
    expect(task.reminderMessageId).toBeUndefined()
    expect(task.alertsSent).toEqual([])
    expect(task.save).toHaveBeenCalled()
  })

  it('cambiar solo el nombre conserva el aviso vivo', async () => {
    task.userId = 7
    task.reminderMessageId = 77
    const ctx = editCtx({ newName: 'Pagar gas' })

    await bot.press('edit_save', ctx)

    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalledWith(7, 77)
    expect(task.reminderMessageId).toBe(77)
  })

  it('sin cambios reales: no guarda, avisa "No hubo cambios"', async () => {
    const ctx = editCtx({ newName: 'Pagar luz' })

    await bot.press('edit_save', ctx)

    expect(task.save).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('ℹ️ No hubo cambios.', {})
  })

  it('tarea borrada a mitad de edición: avisa y limpia la sesión sin lanzar', async () => {
    h.findById.mockResolvedValue(null)
    const ctx = editCtx({ newName: 'Pagar gas' })

    await expect(bot.press('edit_save', ctx)).resolves.not.toThrow()

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Pagar luz'),
      expect.anything()
    )
    expect(ctx.session.flowType).toBeUndefined()
  })

  it('nombre duplicado (E11000): avisa y conserva la sesión', async () => {
    task.save.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000 })
    )
    const ctx = editCtx({ newName: 'Pagar gas' })

    await bot.press('edit_save', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Ya existe una tarea con ese nombre. Elige otro nombre.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBe('edit')
  })

  it('error de guardado inesperado: limpia la sesión en vez de dejarla colgada', async () => {
    task.save.mockRejectedValue(new Error('db caída'))
    const ctx = editCtx({ newName: 'Pagar gas' })

    await expect(bot.press('edit_save', ctx)).resolves.not.toThrow()

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeUndefined()
  })

  it('usuario desautorizado a mitad de flujo: no guarda', async () => {
    h.auth.mockResolvedValue(false)
    const ctx = editCtx({ newName: 'Pagar gas' })

    await bot.press('edit_save', ctx)

    expect(h.findById).not.toHaveBeenCalled()
    expect(task.save).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
  })
})
