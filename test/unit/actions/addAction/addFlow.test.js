import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ tz: vi.fn(), auth: vi.fn() }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)
vi.mock('@/models/task.js', () => ({ Task: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock('@/middlewares/access/isAuthorizedUser.js', () => ({
  isAuthorizedUser: (_ctx, next) => next()
}))

import { registerMessageHandler } from '@/actions/addAction/messageHandler.js'
import { registerFieldActions } from '@/actions/addAction/fieldActions.js'
import { registerConfirmAction } from '@/actions/addAction/confirmAction.js'
import { registerStartAddAction } from '@/actions/addAction/startAddAction.js'

const addCtx = (awaiting, text, session = {}) =>
  makeCtx({
    message: { text, message_id: 20, reply_to_message: { message_id: 15 } },
    session: {
      flowType: 'add',
      awaiting,
      pendingTask: {},
      menuMessageId: 10,
      promptMessageId: 15,
      ...session
    }
  })

describe('/add: arranque', () => {
  it('abre el menú directamente y sustituye la interfaz de un flujo anterior', async () => {
    const bot = makeFakeBot()
    registerStartAddAction(bot)
    const ctx = makeCtx({
      session: { flowType: 'edit', editing: { id: 'x' }, menuMessageId: 3 }
    })

    await bot.run('add', ctx)

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 3)
    expect(ctx.reply.mock.calls[0][0]).toContain('Nueva tarea')
    expect(ctx.session).toMatchObject({
      flowType: 'add',
      pendingTask: {},
      menuMessageId: 6
    })
    expect(ctx.session.editing).toBeUndefined()
  })
})

describe('/add: respuestas de texto', () => {
  let bot
  beforeEach(() => {
    vi.useFakeTimers()
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    bot = makeFakeBot()
    registerMessageHandler(bot)
  })
  afterEach(() => vi.useRealTimers())

  it('un nombre con _ o * no rompe el menú: no usa parse_mode Markdown', async () => {
    const ctx = addCtx('add_name', 'comprar_leche *ya*')

    await bot.say(ctx)

    const options = ctx.telegram.editMessageText.mock.calls[0][4]
    expect(options).not.toHaveProperty('parse_mode')
    expect(ctx.session.pendingTask.name).toBe('comprar_leche *ya*')
  })

  it('el menú avanza en el acto, pero pregunta y respuesta se ven 10 s antes de limpiarse', async () => {
    const ctx = addCtx('add_name', 'Comprar billetes')

    await bot.say(ctx)

    const [, messageId, , text] = ctx.telegram.editMessageText.mock.calls[0]
    expect(messageId).toBe(10)
    expect(text).toContain('Comprar billetes')
    expect(ctx.session.awaiting).toBeNull()
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(9_999)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 15)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 20)
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalledWith(99, 10)
  })

  it('sin menú previo, el reply tampoco usa Markdown', async () => {
    const ctx = addCtx('add_name', 'a_b', { menuMessageId: undefined })
    ctx.callbackQuery = undefined

    await bot.say(ctx)

    expect(ctx.reply.mock.calls[0][1]).not.toHaveProperty('parse_mode')
    expect(ctx.session.menuMessageId).toBe(6)
  })

  it('interpreta la fecha escrita en la zona horaria del usuario', async () => {
    h.tz.mockResolvedValue('America/Bogota')
    const ctx = addCtx('add_date', '25/12/2099 10:00')

    await bot.say(ctx)

    expect(h.tz).toHaveBeenCalledWith(7)
    expect(ctx.session.pendingTask.reminderAt.toISOString()).toBe(
      '2099-12-25T15:00:00.000Z' // 10:00 en Bogotá (UTC-5)
    )
  })

  it('rechaza una fecha inválida: vuelve a preguntar y sigue esperándola', async () => {
    const ctx = addCtx('add_date', 'cuando pueda')

    await bot.say(ctx)

    const [text, options] = ctx.reply.mock.calls[0]
    expect(text).toContain('Fecha inválida')
    expect(options.reply_markup).toEqual({ force_reply: true })
    expect(ctx.session.awaiting).toBe('add_date')
    expect(ctx.session.promptMessageId).toBe(6)
  })
})

describe('/add: botones de campo', () => {
  let bot
  beforeEach(() => {
    h.tz.mockReset().mockResolvedValue('America/Bogota')
    bot = makeFakeBot()
    registerFieldActions(bot)
  })

  it('pedir el nombre abre un force-reply y lo recuerda como prompt pendiente', async () => {
    const ctx = makeCtx({
      session: { flowType: 'add', pendingTask: {}, menuMessageId: 5 }
    })

    await bot.press('add_field_name', ctx)

    expect(ctx.session.awaiting).toBe('add_name')
    expect(ctx.reply.mock.calls[0][1].reply_markup).toEqual({
      force_reply: true
    })
    expect(ctx.session.promptMessageId).toBe(6)
  })

  it('volver del selector de fecha repinta el menú con la zona del usuario', async () => {
    const ctx = makeCtx({
      session: {
        flowType: 'add',
        pendingTask: {
          name: 'a_b',
          reminderAt: new Date('2099-12-25T15:00:00Z')
        },
        menuMessageId: 5
      }
    })

    await bot.press('add_back', ctx)

    const [, , , text, options] = ctx.telegram.editMessageText.mock.calls[0]
    expect(options).not.toHaveProperty('parse_mode')
    expect(text).toContain('10:00') // 15:00Z en Bogotá; en Madrid serían las 16:00
    expect(text).toContain('Revisa los datos')
  })

  it('un botón de un menú antiguo no actúa sobre el flujo vivo', async () => {
    const ctx = makeCtx({
      session: { flowType: 'add', pendingTask: {}, menuMessageId: 99 }
    })

    await bot.press('add_field_name', ctx)

    expect(ctx.session.awaiting).toBeUndefined()
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Esta acción ya no está disponible.'
    )
  })

  it('tras cancelar, un botón del menú ya no hace nada', async () => {
    const ctx = makeCtx({ session: {} })

    await bot.press('add_cal', ctx)

    expect(ctx.telegram.editMessageText).not.toHaveBeenCalled()
    expect(ctx.editMessageReplyMarkup).toHaveBeenCalledWith({
      inline_keyboard: []
    })
  })
})

describe('/add: botón "Cancelar" (add_cancel)', () => {
  it('limpia la sesión y el prompt pendiente, y deja el aviso unos segundos', async () => {
    vi.useFakeTimers()
    h.auth.mockReset().mockResolvedValue(true)
    const bot = makeFakeBot()
    registerConfirmAction(bot)
    const ctx = makeCtx({
      session: {
        flowType: 'add',
        pendingTask: { name: 'a' },
        awaiting: 'add_name',
        menuMessageId: 5,
        promptMessageId: 8
      }
    })

    await bot.press('add_cancel', ctx)

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Creación cancelada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 8)
    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.pendingTask).toBeUndefined()
    expect(ctx.session.awaiting).toBeUndefined()
    expect(ctx.session.menuMessageId).toBeUndefined()
    expect(ctx.session.promptMessageId).toBeUndefined()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 5)
    vi.useRealTimers()
  })
})
