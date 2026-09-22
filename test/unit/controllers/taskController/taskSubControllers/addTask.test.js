import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { addTask } from '@/controllers/taskControllers/addTask.js'

describe('addTask', () => {
  let ctx
  beforeEach(() => {
    h.auth.mockReset()
    ctx = makeCtx({ from: { id: 12345 }, message: { text: '/add' } })
  })

  // El alta ya no se hace en una línea: /add abre un flujo interactivo con botones
  it('si está autorizado muestra el botón "Crear tarea" que abre el flujo', async () => {
    h.auth.mockResolvedValue(true)

    await addTask(ctx)

    const [text, markup] = ctx.reply.mock.calls[0]
    expect(text).toBe('¿Quieres agregar una nueva tarea?')
    expect(markup.reply_markup.inline_keyboard[0][0]).toMatchObject({
      text: 'Crear tarea',
      callback_data: 'add_create'
    })
  })

  it('debe rechazar si el usuario no está autorizado', async () => {
    h.auth.mockResolvedValue(false)

    await addTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })
})
