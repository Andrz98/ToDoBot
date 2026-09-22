import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ find: vi.fn(), tz: vi.fn(), keyboard: vi.fn() }))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.find }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)
vi.mock('@/helpers/taskHelpers/edit/taskSelection.js', () => ({
  getTaskSelectionKeyboard: h.keyboard
}))
vi.mock('@/middlewares/access/isAuthorizedUser.js', () => ({
  isAuthorizedUser: (_ctx, next) => next()
}))

import { registerStartEditAction } from '@/actions/editAction/startEditAction.js'

describe('/edit: selección de tarea', () => {
  let bot, ctx
  beforeEach(() => {
    h.find.mockReset().mockResolvedValue({
      _id: 't1',
      name: 'a<b>&',
      description: 'd',
      reminderAt: new Date('2099-12-25T15:00:00Z')
    })
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    h.keyboard.mockReset()
    bot = makeFakeBot()
    registerStartEditAction(bot)
    ctx = makeCtx({ session: { menuMessageId: 5 } })
  })

  it('edita el mensaje con el menú en HTML y el nombre escapado', async () => {
    await bot.press('select_edit_t1', ctx)

    expect(h.find).toHaveBeenCalledWith(7, { id: 't1' })
    const [, , , text, options] = ctx.telegram.editMessageText.mock.calls[0]
    expect(text).toContain('Nombre: a&lt;b&gt;&amp;')
    expect(options.parse_mode).toBe('HTML')
    expect(ctx.session.editing).toEqual({ id: 't1', oldName: 'a<b>&' })
  })

  it('si no puede editar el mensaje, el reply de respaldo también va en HTML escapado', async () => {
    ctx.telegram.editMessageText.mockRejectedValue(new Error('cannot edit'))

    await bot.press('select_edit_t1', ctx)

    const [text, options] = ctx.reply.mock.calls[0]
    expect(text).toContain('Nombre: a&lt;b&gt;&amp;')
    expect(options.parse_mode).toBe('HTML')
    expect(ctx.session.menuMessageId).toBe(6)
  })

  it('/edit limpia el flujo anterior y muestra el selector en su lugar', async () => {
    h.keyboard.mockResolvedValue({ reply_markup: { inline_keyboard: [] } })
    ctx.session = {
      pendingTask: { name: 'x' },
      awaiting: 'add_name',
      menuMessageId: 3,
      promptMessageId: 4
    }

    await bot.run('edit', ctx)

    expect(ctx.session.flowType).toBe('edit')
    expect(ctx.session.pendingTask).toBeUndefined()
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 3)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 4)
    expect(ctx.reply.mock.calls[0][0]).toBe(
      'Selecciona la tarea que quieres editar:'
    )
    expect(ctx.session.menuMessageId).toBe(6)
  })

  it('/edit sin tareas avisa y no deja un flujo colgado', async () => {
    h.keyboard.mockResolvedValue(null)

    await bot.run('edit', ctx)

    expect(ctx.reply.mock.calls[0][0]).toContain('No tienes tareas activas')
    expect(ctx.session.flowType).toBeUndefined()
  })
})
