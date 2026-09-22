import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), flash: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock('@/models/task.js', () => ({ Task: { find: h.find } }))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: h.flash }))

import { listTasks } from '@/controllers/taskControllers/listTask.js'

const sortReturning = (tasks) => ({ sort: vi.fn().mockResolvedValue(tasks) })

describe('listTasks', () => {
  let ctx
  beforeEach(() => {
    h.auth.mockReset().mockResolvedValue(true)
    h.find.mockReset()
    h.flash.mockReset()
    ctx = makeCtx({ from: { id: 12345 }, message: { text: '/list' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  // Parte 1: Debe rechazar si el usuario no está autorizado
  it('debe rechazar si el usuario no esta autorizado', async () => {
    h.auth.mockResolvedValue(false)

    await listTasks(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
    expect(h.find).not.toHaveBeenCalled()
  })

  // Parte 2: Debe mostrar un mensaje si el usuario no tiene tareas activas
  it('debe responder que no hay tareas activas en /list', async () => {
    h.find.mockReturnValue(sortReturning([]))

    await listTasks(ctx)

    expect(h.find).toHaveBeenCalledWith({ userId: 12345, completed: false })
    expect(ctx.reply).toHaveBeenCalledWith('No tienes tareas activas.', {
      parse_mode: 'HTML'
    })
  })

  // Parte 3: Debe mostrar tareas si existen
  it('debe listar las tareas si existen en /list', async () => {
    h.find.mockReturnValue(
      sortReturning([
        { _id: 'a1', name: 'Comprar pan' },
        { _id: 'b2', name: 'Comprar ordenador' }
      ])
    )

    await listTasks(ctx)

    expect(h.flash).toHaveBeenCalledWith(ctx, 'Lista de tareas')
    expect(ctx.reply).toHaveBeenCalledWith(
      'Selecciona una tarea para ver sus detalles:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '1. Comprar pan', callback_data: 'show_task_a1' }],
            [{ text: '2. Comprar ordenador', callback_data: 'show_task_b2' }]
          ]
        }
      }
    )
  })

  // Parte 4: Muestro un error genérico si algo falla
  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    h.find.mockImplementation(() => {
      throw new Error('Fallo inesperado')
    })

    await listTasks(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al mostrar tus tareas. Intenta más tarde.',
      {}
    )
  })
})
