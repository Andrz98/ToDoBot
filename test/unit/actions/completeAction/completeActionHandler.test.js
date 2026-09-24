import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn(),
  auth: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/models/task.js', () => ({
  Task: {
    findById: h.findById,
    findByIdAndUpdate: h.findByIdAndUpdate,
    findOneAndUpdate: h.findOneAndUpdate
  }
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerCompleteActions } from '@/actions/completeAction/completeActionHandler.js'

describe('flujo /done', () => {
  let bot, ctx
  beforeEach(() => {
    vi.useFakeTimers()
    Object.values(h).forEach((fn) => fn.mockReset())
    h.findTask.mockResolvedValue({ name: 'Pagar luz' })
    h.auth.mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    ctx = makeCtx()
    registerCompleteActions(bot)
  })
  afterEach(() => vi.useRealTimers())

  it('al seleccionar, solo busca tareas del propio usuario', async () => {
    await bot.press('complete_select:abc123', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
    expect(ctx.session.pendingComplete).toBe('abc123')
  })

  it('tarea ajena: avisa y no abre el flujo', async () => {
    h.findTask.mockResolvedValue(null)

    await bot.press('complete_select:abc123', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.session.pendingComplete).toBeUndefined()
  })

  it('pide confirmación en el mismo mensaje, con el nombre escapado', async () => {
    h.findTask.mockResolvedValue({ name: 'a<b>&' })

    await bot.press('complete_select:abc123', ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
    const [, messageId, , text] = ctx.telegram.editMessageText.mock.calls[0]
    expect(messageId).toBe(5)
    expect(text).toContain('<b>a&lt;b&gt;&amp;</b>')
  })

  it('al confirmar, completa solo si la tarea es del usuario y resuelve el mensaje en sitio', async () => {
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_confirm:yes', ctx)

    expect(h.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc123', userId: 7 },
      { completed: true }
    )
    expect(h.findByIdAndUpdate).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Tarea completada.', {})
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      '✅ Tarea completada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingComplete).toBeNull()

    // El aviso de resultado no debe quedarse para siempre en el chat
    await vi.advanceTimersByTimeAsync(10_000)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 5)
  })

  it('al completar retira el aviso de recordatorio vivo de la tarea', async () => {
    ctx.session.pendingComplete = 'abc123'
    h.findOneAndUpdate.mockResolvedValue({ userId: 7, reminderMessageId: 77 })

    await bot.press('complete_confirm:yes', ctx)

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 77)
  })

  it('cancelar resuelve el mensaje en sitio y limpia la sesión', async () => {
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_confirm:no', ctx)

    expect(h.findOneAndUpdate).not.toHaveBeenCalled()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Operación cancelada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingComplete).toBeNull()
  })

  it('doble-tap: la segunda confirmación no vuelve a completar', async () => {
    ctx.session.pendingComplete = 'abc123'
    await bot.press('complete_confirm:yes', ctx)
    h.findOneAndUpdate.mockClear()

    await bot.press('complete_confirm:yes', ctx)

    expect(h.findOneAndUpdate).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Esta acción ya fue procesada o expiró.',
      { show_alert: true }
    )
  })

  it('usuario desautorizado a mitad de flujo: no completa', async () => {
    h.auth.mockResolvedValue(false)
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_confirm:yes', ctx)

    expect(h.findOneAndUpdate).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
  })

  it('error de BD al completar: limpia la sesión en vez de dejarla colgada', async () => {
    ctx.session.pendingComplete = 'abc123'
    h.findOneAndUpdate.mockRejectedValue(new Error('Fallo de Mongo'))

    await bot.press('complete_confirm:yes', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingComplete).toBeNull()
  })
})
