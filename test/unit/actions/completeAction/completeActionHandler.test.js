import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn(),
  auth: vi.fn(),
  all: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/helpers/tasks/findAllTasks.js', () => ({
  findAllTasks: h.all
}))
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

const REMAINING = [{ _id: 'b2', name: 'Comprar pan' }]

describe('flujo /done', () => {
  let bot, ctx
  beforeEach(() => {
    vi.useFakeTimers()
    Object.values(h).forEach((fn) => fn.mockReset())
    h.findTask.mockResolvedValue({ name: 'Pagar luz' })
    h.auth.mockResolvedValue(true)
    h.all.mockResolvedValue(REMAINING)
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

  it('al confirmar, completa solo si la tarea es del usuario y sigue en la lista con las que quedan', async () => {
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_confirm:yes', ctx)

    expect(h.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc123', userId: 7 },
      { completed: true }
    )
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Tarea completada.', {})
    expect(h.all).toHaveBeenCalledWith(7)
    const [, messageId, , text, extra] =
      ctx.telegram.editMessageText.mock.calls.at(-1)
    expect(messageId).toBe(5)
    expect(text).toBe(
      '✅ Tarea completada.\n\nSelecciona la tarea que deseas completar:'
    )
    expect(
      extra.reply_markup.inline_keyboard
        .flat()
        .map(({ text, callback_data }) => ({ text, callback_data }))
    ).toEqual([
      { text: 'Comprar pan', callback_data: 'complete_select:b2' },
      { text: '✔️ Finalizar acción', callback_data: 'complete_cancel' }
    ])
    expect(ctx.session.flowType).toBe('complete')
    expect(ctx.session.pendingComplete).toBeNull()

    // El menú sigue abierto: no se borra a los 10 s como un aviso de resultado
    await vi.advanceTimersByTimeAsync(10_000)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalledWith(99, 5)
  })

  it('si era la última tarea, cierra el flujo con el resultado', async () => {
    ctx.session.pendingComplete = 'abc123'
    h.all.mockResolvedValue([])

    await bot.press('complete_confirm:yes', ctx)

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      '✅ Tarea completada.\n\n📭 No te quedan tareas pendientes.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingComplete).toBeNull()

    // Sin nada más que hacer, el resultado se limpia como cualquier aviso
    await vi.advanceTimersByTimeAsync(10_000)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 5)
  })

  it('al completar retira el aviso de recordatorio vivo de la tarea', async () => {
    ctx.session.pendingComplete = 'abc123'
    h.findOneAndUpdate.mockResolvedValue({ userId: 7, reminderMessageId: 77 })

    await bot.press('complete_confirm:yes', ctx)

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 77)
  })

  it('"No" no completa nada y vuelve a la lista sin sacar al usuario', async () => {
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_confirm:no', ctx)

    expect(h.findOneAndUpdate).not.toHaveBeenCalled()
    const [, , , text] = ctx.telegram.editMessageText.mock.calls.at(-1)
    expect(text).toBe('Selecciona la tarea que deseas completar:')
    expect(ctx.session.flowType).toBe('complete')
    expect(ctx.session.pendingComplete).toBeNull()
  })

  it('"Finalizar acción" cierra el flujo y limpia la sesión', async () => {
    ctx.session.flowType = 'complete'
    ctx.session.pendingComplete = 'abc123'

    await bot.press('complete_cancel', ctx)

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Acción finalizada.',
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
