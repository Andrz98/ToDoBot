import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn(), all: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock('@/helpers/tasks/findAllTasks.js', () => ({ findAllTasks: h.all }))

import { completeTask } from '@/controllers/taskControllers/completeTask.js'

describe('completeTask', () => {
  let ctx
  beforeEach(() => {
    h.auth.mockReset().mockResolvedValue(true)
    h.all.mockReset()
    ctx = makeCtx({ from: { id: 12345 }, message: { text: '/done' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('debe rechazar si el usuario no está autorizado', async () => {
    h.auth.mockResolvedValue(false)

    await completeTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
    expect(h.all).not.toHaveBeenCalled()
  })

  it('debe avisar si no hay tareas pendientes', async () => {
    h.all.mockResolvedValue([])

    await completeTask(ctx)

    expect(h.all).toHaveBeenCalledWith(12345)
    expect(ctx.reply).toHaveBeenCalledWith(
      '📭 No tienes tareas pendientes para completar.',
      {}
    )
  })

  it('debe ofrecer un botón por tarea pendiente', async () => {
    h.all.mockResolvedValue([
      { _id: 'a1', name: 'Comprar pan' },
      { _id: 'b2', name: 'Pagar luz' }
    ])

    await completeTask(ctx)

    const [text, options] = ctx.reply.mock.calls[0]
    expect(text).toBe('Selecciona la tarea que deseas completar:')
    expect(
      options.reply_markup.inline_keyboard
        .flat()
        .map(({ text, callback_data }) => ({ text, callback_data }))
    ).toEqual([
      { text: 'Comprar pan', callback_data: 'complete_select:a1' },
      { text: 'Pagar luz', callback_data: 'complete_select:b2' },
      { text: '✖️ Cancelar', callback_data: 'complete_cancel' }
    ])
    expect(ctx.session.flowType).toBe('complete')
  })

  it('autocura un flowType obsoleto de otro flujo abandonado', async () => {
    ctx.session.flowType = 'add'
    h.all.mockResolvedValue([{ _id: 'a1', name: 'Comprar pan' }])

    await completeTask(ctx)

    expect(ctx.session.flowType).toBe('complete')
  })

  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    h.all.mockRejectedValue(new Error('Fallo inesperado'))

    await completeTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Algo salió mal al iniciar el flujo de completar tareas. Intenta más tarde.',
      {}
    )
  })
})
