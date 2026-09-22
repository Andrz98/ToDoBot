import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ tz: vi.fn() }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)

import { registerDatePicker } from '@/actions/datePickerAction/registerDatePicker.js'

describe('selector de fecha/hora (handlers)', () => {
  let bot, flow, ctx
  const editedText = () => ctx.telegram.editMessageText.mock.calls.at(-1)[3]
  const editedId = () => ctx.telegram.editMessageText.mock.calls.at(-1)[1]

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T10:20:00Z')) // 12:20 en Madrid
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    flow = {
      isActive: vi.fn(() => true),
      onPicked: vi.fn(),
      onBack: vi.fn(),
      onTextFallback: vi.fn()
    }
    bot = makeFakeBot()
    registerDatePicker(bot, 'add', flow)
    ctx = makeCtx({ session: { menuMessageId: 5 } })
  })
  afterEach(() => vi.useRealTimers())

  it('calendario → día → hora → minutos, siempre editando el mismo mensaje', async () => {
    await bot.press('add_cal', ctx)
    expect(editedText()).toContain('Octubre 2026')

    await bot.press('add_cal:2026-11', ctx)
    expect(editedText()).toContain('Noviembre 2026')

    await bot.press('add_day:2026-11-03', ctx)
    expect(editedText()).toContain('Elige la hora')

    await bot.press('add_hour:2026-11-03T18', ctx)
    expect(editedText()).toContain('18:__')

    await bot.press('add_min:2026-11-03T18:30', ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.telegram.editMessageText.mock.calls.every(([, id]) => id === 5)).toBe(true)
    expect(editedId()).toBe(5)
    expect(flow.onPicked).toHaveBeenCalledWith(
      ctx,
      new Date('2026-11-03T17:30:00.000Z') // 18:30 en Madrid (UTC+1 en noviembre)
    )
  })

  it('un día ya pasado (callback atrasado) vuelve al calendario con aviso', async () => {
    await bot.press('add_day:2026-10-01', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Esa fecha ya pasó. Elige otra.', {})
    expect(editedText()).toContain('Octubre 2026')
  })

  it('una hora ya pasada no se acepta aunque llegue en el callback', async () => {
    await bot.press('add_min:2026-10-15T12:00', ctx)

    expect(flow.onPicked).not.toHaveBeenCalled()
    expect(editedText()).toContain('Elige el día')
  })

  it('con el flujo cancelado, el calendario antiguo caduca en vez de actuar', async () => {
    flow.isActive.mockReturnValue(false)

    await bot.press('add_day:2026-11-03', ctx)

    expect(ctx.telegram.editMessageText).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Esta acción ya no está disponible.')
  })

  it('un calendario de otro mensaje (interfaz antigua) no actúa sobre el flujo vivo', async () => {
    ctx.session.menuMessageId = 77

    await bot.press('add_min:2026-11-03T18:30', ctx)

    expect(flow.onPicked).not.toHaveBeenCalled()
  })

  it('volver y escribir a mano delegan en el flujo', async () => {
    await bot.press('add_back', ctx)
    await bot.press('add_datetext', ctx)

    expect(flow.onBack).toHaveBeenCalledWith(ctx)
    expect(flow.onTextFallback).toHaveBeenCalledWith(ctx)
  })

  it('pulsar varias veces rápido la misma pantalla no genera mensajes nuevos', async () => {
    ctx.telegram.editMessageText.mockRejectedValue(
      Object.assign(new Error('400'), {
        description: 'Bad Request: message is not modified'
      })
    )

    await bot.press('add_cal', ctx)
    await bot.press('add_cal', ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
  })
})
