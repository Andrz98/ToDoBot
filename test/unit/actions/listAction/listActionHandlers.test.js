import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findTask: vi.fn(),
  tz: vi.fn(),
  findById: vi.fn()
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: vi.fn() }))

import { registerListActions } from '@/actions/listAction/listActionHandlers.js'

const task = (extra = {}) => ({
  name: 'Pagar luz',
  description: 'urgente',
  reminderAt: new Date('2099-12-25T15:00:00Z'),
  ...extra
})

describe('show_task_ (detalle de tarea)', () => {
  let bot, ctx
  beforeEach(() => {
    h.findTask.mockReset().mockResolvedValue(task())
    h.findById.mockReset()
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    bot = makeFakeBot()
    ctx = makeCtx()
    registerListActions(bot)
  })

  it('solo lee tareas del usuario que pulsa el botón', async () => {
    await bot.press('show_task_abc123', ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
  })

  it('tarea ajena o inexistente: avisa y no muestra detalle', async () => {
    h.findTask.mockResolvedValue(null)

    await bot.press('show_task_abc123', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('escapa el HTML de nombre y descripción', async () => {
    h.findTask.mockResolvedValue(task({ name: 'a<b', description: 'x & <i>y' }))

    await bot.press('show_task_abc123', ctx)

    const text = ctx.reply.mock.calls[0][0]
    expect(text).toContain('<b>a&lt;b</b>')
    expect(text).toContain('x &amp; &lt;i&gt;y')
  })

  it('formatea la fecha con la zona horaria del usuario', async () => {
    h.tz.mockResolvedValue('America/Bogota')

    await bot.press('show_task_abc123', ctx)

    expect(h.tz).toHaveBeenCalledWith(7)
    expect(ctx.reply.mock.calls[0][0]).toContain('10:00') // 15:00Z = 10:00 en Bogotá
  })
})
