import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  all: vi.fn(),
  tz: vi.fn(),
  findById: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/helpers/tasks/findAllTasks.js', () => ({ findAllTasks: h.all }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { registerListActions } from '@/actions/listAction/listActionHandlers.js'

const task = (extra = {}) => ({
  name: 'Pagar luz',
  description: 'urgente',
  reminderAt: new Date('2099-12-25T15:00:00Z'),
  ...extra
})

const tasks = (n) =>
  Array.from({ length: n }, (_, i) => ({ _id: `t${i}`, name: `Tarea ${i + 1}` }))

describe('show_task_ (detalle de tarea)', () => {
  let bot, ctx
  beforeEach(() => {
    h.findTask.mockReset().mockResolvedValue(task())
    h.all.mockReset().mockResolvedValue(tasks(3))
    h.findById.mockReset()
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    bot = makeFakeBot()
    ctx = makeCtx()
    registerListActions(bot)
  })

  it('solo lee tareas del usuario que pulsa el botón', async () => {
    await bot.press('show_task_abc123:0', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
  })

  it('muestra el detalle en el mismo mensaje, con vuelta a su página', async () => {
    await bot.press('show_task_abc123:2', ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
    const [, options] = ctx.editMessageText.mock.calls[0]
    expect(options.reply_markup.inline_keyboard[0][0].callback_data).toBe(
      'list_page_2'
    )
  })

  it('acepta botones de listados antiguos sin página', async () => {
    await bot.press('show_task_abc123', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    const [, options] = ctx.editMessageText.mock.calls[0]
    expect(options.reply_markup.inline_keyboard[0][0].callback_data).toBe(
      'list_page_0'
    )
  })

  it('tarea ajena o inexistente: avisa y repinta el listado', async () => {
    h.findTask.mockResolvedValue(null)

    await bot.press('show_task_abc123:0', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.editMessageText.mock.calls[0][0]).toContain('Mis tareas (3)')
  })

  it('escapa el HTML de nombre y descripción', async () => {
    h.findTask.mockResolvedValue(task({ name: 'a<b', description: 'x & <i>y' }))

    await bot.press('show_task_abc123:0', ctx)

    const [text, options] = ctx.editMessageText.mock.calls[0]
    expect(options.parse_mode).toBe('HTML')
    expect(text).toContain('<b>a&lt;b</b>')
    expect(text).toContain('x &amp; &lt;i&gt;y')
  })

  it('formatea la fecha con la zona horaria del usuario', async () => {
    h.tz.mockResolvedValue('America/Bogota')

    await bot.press('show_task_abc123:0', ctx)

    expect(h.tz).toHaveBeenCalledWith(7)
    expect(ctx.editMessageText.mock.calls[0][0]).toContain('10:00') // 15:00Z = 10:00 en Bogotá
  })
})

describe('list_page_ (paginación)', () => {
  let bot, ctx
  beforeEach(() => {
    h.all.mockReset()
    bot = makeFakeBot()
    ctx = makeCtx()
    registerListActions(bot)
  })

  const buttons = () =>
    ctx.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard

  it('navega editando el mismo mensaje', async () => {
    h.all.mockResolvedValue(tasks(20))

    await bot.press('list_page_1', ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.editMessageText.mock.calls[0][0]).toContain('página 2/3')
    expect(buttons()[0][0].text).toBe('9. Tarea 9')
    expect(buttons().at(-1).map((b) => b.callback_data)).toEqual([
      'list_page_0',
      'list_noop',
      'list_page_2'
    ])
  })

  it('una página fuera de rango (tareas borradas mientras tanto) se ajusta a la última', async () => {
    h.all.mockResolvedValue(tasks(3))

    await bot.press('list_page_5', ctx)

    expect(buttons()).toHaveLength(3) // sin fila de navegación: cabe en una página
    expect(buttons()[2][0].callback_data).toBe('show_task_t2:0')
  })

  it('sin tareas ya, el listado lo indica y se limpia', async () => {
    h.all.mockResolvedValue([])

    await bot.press('list_page_0', ctx)

    expect(ctx.editMessageText.mock.calls[0][0]).toContain('No tienes tareas')
  })

  it('un fallo al editar (mensaje ya borrado) no rompe el flujo', async () => {
    h.all.mockResolvedValue(tasks(3))
    ctx.editMessageText.mockRejectedValue(new Error('message to edit not found'))

    await expect(bot.press('list_page_0', ctx)).resolves.not.toThrow()
  })
})
