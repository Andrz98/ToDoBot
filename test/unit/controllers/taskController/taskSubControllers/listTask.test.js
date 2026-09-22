import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeCtx } from '../../../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn(), all: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock('@/helpers/tasks/findAllTasks.js', () => ({ findAllTasks: h.all }))

import { listTasks } from '@/controllers/taskControllers/listTask.js'

const TEN_MINUTES = 10 * 60_000

describe('listTasks', () => {
  let ctx
  beforeEach(() => {
    vi.useFakeTimers()
    h.auth.mockReset().mockResolvedValue(true)
    h.all.mockReset()
    ctx = makeCtx({ from: { id: 12345 }, message: { text: '/list' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.useRealTimers())

  it('debe rechazar si el usuario no esta autorizado', async () => {
    h.auth.mockResolvedValue(false)

    await listTasks(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
    expect(h.all).not.toHaveBeenCalled()
  })

  it('sin tareas activas avisa, ofrece crear una y se limpia', async () => {
    h.all.mockResolvedValue([])

    await listTasks(ctx)

    expect(h.all).toHaveBeenCalledWith(12345)
    const [text, extra] = ctx.reply.mock.calls[0]
    expect(text).toBe('📭 No tienes tareas activas.')
    expect(extra.reply_markup.inline_keyboard[0][0].callback_data).toBe(
      'menu_add'
    )
    await vi.advanceTimersByTimeAsync(TEN_MINUTES)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 6)
  })

  it('lista las tareas en un único mensaje, sin avisos previos', async () => {
    h.all.mockResolvedValue([
      { _id: 'a1', name: 'Comprar pan' },
      { _id: 'b2', name: 'Comprar ordenador' }
    ])

    await listTasks(ctx)

    expect(ctx.reply).toHaveBeenCalledTimes(1)
    const [text, options] = ctx.reply.mock.calls[0]
    expect(text).toContain('Mis tareas (2)')
    expect(options.reply_markup.inline_keyboard).toEqual([
      [
        { text: '1. Comprar pan', callback_data: 'show_task_a1:0', hide: false }
      ],
      [
        {
          text: '2. Comprar ordenador',
          callback_data: 'show_task_b2:0',
          hide: false
        }
      ]
    ])
    expect(ctx.session.listMessageId).toBe(6)
  })

  it('el listado permanece 10 minutos y después se limpia', async () => {
    h.all.mockResolvedValue([{ _id: 'a1', name: 'Comprar pan' }])

    await listTasks(ctx)

    await vi.advanceTimersByTimeAsync(TEN_MINUTES - 1)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 6)
  })

  it('repetir /list sustituye el listado anterior en vez de acumularlo', async () => {
    h.all.mockResolvedValue([{ _id: 'a1', name: 'Comprar pan' }])
    ctx.session.listMessageId = 3

    await listTasks(ctx)

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 3)
    expect(ctx.session.listMessageId).toBe(6)
  })

  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    h.all.mockRejectedValue(new Error('Fallo inesperado'))

    await listTasks(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al mostrar tus tareas. Intenta más tarde.',
      {}
    )
  })
})
