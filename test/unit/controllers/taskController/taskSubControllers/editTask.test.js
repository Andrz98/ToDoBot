import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../../support/telegram.js'

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  all: vi.fn(),
  find: vi.fn(),
  tz: vi.fn()
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock('@/helpers/tasks/findAllTasks.js', () => ({ findAllTasks: h.all }))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.find }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { editTask } from '@/controllers/taskControllers/editTask.js'

describe('editTask', () => {
  let ctx
  beforeEach(() => {
    h.auth.mockReset().mockResolvedValue(true)
    h.all.mockReset()
    h.find.mockReset()
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    ctx = makeCtx({ from: { id: 12345 }, message: { text: '/edit' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('rechaza un mensaje sin texto', async () => {
    ctx.message = undefined

    await editTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 El mensaje recibido no es válido.'
    )
  })

  it('debe rechazar si el usuario no está autorizado', async () => {
    h.auth.mockResolvedValue(false)

    await editTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })

  it('sin argumento y sin tareas avisa de que no hay nada que editar', async () => {
    h.all.mockResolvedValue([])

    await editTask(ctx)

    expect(ctx.reply.mock.calls[0][0]).toBe(
      'No tienes tareas activas para editar.'
    )
  })

  it('sin argumento lista las tareas para elegir', async () => {
    h.all.mockResolvedValue([{ _id: 'a1', name: 'Comprar pan' }])

    await editTask(ctx)

    const [text, options] = ctx.reply.mock.calls[0]
    expect(text).toBe('Selecciona la tarea que quieres editar:')
    expect(options.reply_markup.inline_keyboard[0][0].callback_data).toBe(
      'select_edit_a1'
    )
  })

  it('con un nombre que no existe responde que no se encontró', async () => {
    ctx.message.text = '/edit Comprar pan'
    h.find.mockResolvedValue(null)

    await editTask(ctx)

    expect(h.find).toHaveBeenCalledWith(12345, { name: 'Comprar pan' })
    expect(ctx.reply.mock.calls[0][0]).toBe(
      '🤯 No se encontró ninguna tarea llamada "Comprar pan".'
    )
  })

  it('escapa el HTML del nombre en el mensaje de "no encontrada"', async () => {
    ctx.message.text = '/edit a<b>&'
    h.find.mockResolvedValue(null)

    await editTask(ctx)

    const [text, options] = ctx.reply.mock.calls[0]
    expect(text).toBe(
      '🤯 No se encontró ninguna tarea llamada "a&lt;b&gt;&amp;".'
    )
    expect(options.parse_mode).toBe('HTML')
  })

  it('con un nombre válido abre el flujo de edición con su menú', async () => {
    ctx.message.text = '/edit Comprar pan'
    h.find.mockResolvedValue({
      _id: 't1',
      name: 'Comprar pan',
      description: 'En la panadería nueva',
      reminderAt: new Date('2099-12-25T15:00:00Z')
    })

    await editTask(ctx)

    expect(ctx.session.flowType).toBe('edit')
    expect(ctx.session.editing).toEqual({ id: 't1', oldName: 'Comprar pan' })
    expect(ctx.reply.mock.calls[0][0]).toContain('Nombre: Comprar pan')
  })

  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    h.all.mockRejectedValue(new Error('Fallo inesperado'))

    await editTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al editar la tarea. Intenta más tarde.',
      {}
    )
  })
})
