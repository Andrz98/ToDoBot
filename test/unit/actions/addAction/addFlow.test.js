import { describe, it, expect, vi, beforeEach } from 'vitest'
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

import { registerMessageHandler } from '@/actions/addAction/messageHandler.js'
import { registerFieldActions } from '@/actions/addAction/fieldActions.js'
import { registerConfirmAction } from '@/actions/addAction/confirmAction.js'

const addCtx = (awaiting, text, session = {}) =>
  makeCtx({
    message: { text },
    session: {
      flowType: 'add',
      awaiting,
      pendingTask: {},
      menuMessageId: 10,
      ...session
    }
  })

describe('/add: respuestas de texto', () => {
  let bot
  beforeEach(() => {
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    bot = makeFakeBot()
    registerMessageHandler(bot)
  })

  it('un nombre con _ o * no rompe el menú: no usa parse_mode Markdown', async () => {
    const ctx = addCtx('add_name', 'comprar_leche *ya*')

    await bot.say(ctx)

    const options = ctx.telegram.editMessageText.mock.calls[0][4]
    expect(options).not.toHaveProperty('parse_mode')
    expect(ctx.session.pendingTask.name).toBe('comprar_leche *ya*')
  })

  it('sin menú previo, el reply tampoco usa Markdown', async () => {
    const ctx = addCtx('add_name', 'a_b', { menuMessageId: undefined })

    await bot.say(ctx)

    expect(ctx.reply.mock.calls[0][1]).not.toHaveProperty('parse_mode')
  })

  it('interpreta la fecha en la zona horaria del usuario', async () => {
    h.tz.mockResolvedValue('America/Bogota')
    const ctx = addCtx('add_date', '25/12/2099 10:00')

    await bot.say(ctx)

    expect(h.tz).toHaveBeenCalledWith(7)
    expect(ctx.session.pendingTask.reminderAt.toISOString()).toBe(
      '2099-12-25T15:00:00.000Z' // 10:00 en Bogotá (UTC-5)
    )
  })

  it('rechaza una fecha inválida y sigue esperándola', async () => {
    const ctx = addCtx('add_date', 'cuando pueda')

    await bot.say(ctx)

    expect(ctx.reply.mock.calls[0][0]).toContain('Fecha inválida')
    expect(ctx.session.awaiting).toBe('add_date')
  })
})

describe('/add: botón "Crear tarea" (add_create)', () => {
  it('muestra el resumen sin Markdown y con la zona del usuario', async () => {
    h.tz.mockReset().mockResolvedValue('America/Bogota')
    const bot = makeFakeBot()
    registerFieldActions(bot)
    const ctx = makeCtx({
      session: {
        pendingTask: {
          name: 'a_b',
          reminderAt: new Date('2099-12-25T15:00:00Z')
        },
        menuMessageId: 10
      }
    })

    await bot.press('add_create', ctx)

    const [, , , text, options] = ctx.telegram.editMessageText.mock.calls[0]
    expect(options).not.toHaveProperty('parse_mode')
    expect(text).toContain('10:00') // 15:00Z en Bogotá; en Madrid serían las 16:00
  })

  it('un /add abandonado y reiniciado: el botón viejo pasa a ser la fuente de verdad', async () => {
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    const bot = makeFakeBot()
    registerFieldActions(bot)
    // El mensaje viejo (id 5, el que devuelve makeCtx por defecto en
    // callbackQuery.message) es el que se pulsa, pero la sesión trackea
    // uno más nuevo (99) de un /add posterior
    const ctx = makeCtx({
      session: { pendingTask: {}, menuMessageId: 99 }
    })

    await bot.press('add_create', ctx)

    expect(ctx.session.menuMessageId).toBe(5)
    const [, messageId] = ctx.telegram.editMessageText.mock.calls[0]
    expect(messageId).toBe(5)
  })
})

describe('/add: botón "Cancelar" (add_cancel)', () => {
  it('limpia la sesión y resuelve el mensaje en sitio', async () => {
    h.auth.mockReset().mockResolvedValue(true)
    const bot = makeFakeBot()
    registerConfirmAction(bot)
    const ctx = makeCtx({
      session: {
        flowType: 'add',
        pendingTask: { name: 'a' },
        awaiting: 'add_name',
        menuMessageId: 10
      }
    })

    await bot.press('add_cancel', ctx)

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Creación cancelada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.pendingTask).toBeUndefined()
    expect(ctx.session.awaiting).toBeUndefined()
    expect(ctx.session.menuMessageId).toBeUndefined()
  })
})
