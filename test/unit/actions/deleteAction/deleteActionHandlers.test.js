import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  findById: vi.fn(),
  findByIdAndDelete: vi.fn(),
  findOneAndDelete: vi.fn(),
  auth: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/models/task.js', () => ({
  Task: {
    findById: h.findById,
    findByIdAndDelete: h.findByIdAndDelete,
    findOneAndDelete: h.findOneAndDelete
  }
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerDeleteActions } from '@/actions/deleteAction/deleteActionHandlers.js'

describe('flujo /delete', () => {
  let bot, ctx
  beforeEach(() => {
    Object.values(h).forEach((fn) => fn.mockReset())
    h.findTask.mockResolvedValue({ name: 'Pagar luz' })
    h.auth.mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    ctx = makeCtx()
    registerDeleteActions(bot)
  })

  it('al seleccionar, solo busca tareas del propio usuario', async () => {
    await bot.press('delete_select:abc123', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
    expect(ctx.session.pendingDelete).toBe('abc123')
  })

  it('tarea ajena: avisa y no abre el flujo', async () => {
    h.findTask.mockResolvedValue(null)

    await bot.press('delete_select:abc123', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.session.pendingDelete).toBeUndefined()
  })

  it('pide confirmación en el mismo mensaje, con el nombre escapado', async () => {
    h.findTask.mockResolvedValue({ name: 'a<b>&' })

    await bot.press('delete_select:abc123', ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
    const [, messageId, , text] = ctx.telegram.editMessageText.mock.calls[0]
    expect(messageId).toBe(5)
    expect(text).toContain('<b>a&lt;b&gt;&amp;</b>')
  })

  it('al confirmar, borra solo si la tarea es del usuario y resuelve el mensaje en sitio', async () => {
    ctx.session.pendingDelete = 'abc123'

    await bot.press('delete_confirm:yes', ctx)

    expect(h.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'abc123',
      userId: 7
    })
    expect(h.findByIdAndDelete).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Tarea eliminada.', {})
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      '✅ Tarea eliminada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingDelete).toBeNull()
  })

  it('cancelar resuelve el mensaje en sitio y limpia la sesión', async () => {
    ctx.session.pendingDelete = 'abc123'

    await bot.press('delete_confirm:no', ctx)

    expect(h.findOneAndDelete).not.toHaveBeenCalled()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Operación cancelada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingDelete).toBeNull()
  })

  it('doble-tap: la segunda confirmación no vuelve a borrar', async () => {
    ctx.session.pendingDelete = 'abc123'
    await bot.press('delete_confirm:yes', ctx)
    h.findOneAndDelete.mockClear()

    await bot.press('delete_confirm:yes', ctx)

    expect(h.findOneAndDelete).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Esta acción ya fue procesada o expiró.',
      { show_alert: true }
    )
  })

  it('usuario desautorizado a mitad de flujo: no borra', async () => {
    h.auth.mockResolvedValue(false)
    ctx.session.pendingDelete = 'abc123'

    await bot.press('delete_confirm:yes', ctx)

    expect(h.findOneAndDelete).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
  })

  it('error de BD al borrar: limpia la sesión en vez de dejarla colgada', async () => {
    ctx.session.pendingDelete = 'abc123'
    h.findOneAndDelete.mockRejectedValue(new Error('Fallo de Mongo'))

    await bot.press('delete_confirm:yes', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingDelete).toBeNull()
  })
})
