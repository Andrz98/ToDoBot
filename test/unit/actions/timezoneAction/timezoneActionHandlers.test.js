import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ update: vi.fn(), auth: vi.fn() }))
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { findOneAndUpdate: h.update }
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerTimezoneActions } from '@/actions/timezoneAction/timezoneActionHandlers.js'

describe('/settimezone: botones', () => {
  let bot, ctx
  beforeEach(() => {
    h.update.mockReset().mockResolvedValue({ userId: 7 })
    h.auth.mockReset().mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerTimezoneActions(bot)
    ctx = makeCtx()
  })

  it('una zona válida pide confirmación', async () => {
    await bot.press('set_tz_America/Bogota', ctx)

    expect(ctx.session.pendingTz).toBe('America/Bogota')
    expect(ctx.reply.mock.calls[0][0]).toContain('America/Bogota')
  })

  it('una zona fuera de la lista blanca se rechaza sin tocar la sesión', async () => {
    await bot.press('set_tz_Mars/Olympus', ctx)

    expect(ctx.session.pendingTz).toBeUndefined()
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(expect.any(String), {
      show_alert: true
    })
  })

  it('confirmar con una zona válida en sesión la guarda y resuelve el mensaje en sitio', async () => {
    ctx.session.pendingTz = 'America/Bogota'

    await bot.press('confirm_tz_yes', ctx)

    expect(h.update).toHaveBeenCalledWith(
      { userId: 7 },
      { timezone: 'America/Bogota' },
      { new: true }
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingTz).toBeNull()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      '✅ Zona horaria actualizada a America/Bogota.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
  })

  it('confirmar sin zona pendiente (sesión perdida) no escribe en la base de datos', async () => {
    await bot.press('confirm_tz_yes', ctx)

    expect(h.update).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(expect.any(String), {
      show_alert: true
    })
  })

  it('"No" cancela y resuelve el mensaje en sitio', async () => {
    ctx.session.pendingTz = 'America/Bogota'

    await bot.press('confirm_tz_no', ctx)

    expect(h.update).not.toHaveBeenCalled()
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Operación cancelada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
  })

  it('usuario desautorizado a mitad de flujo: no escribe en la base de datos', async () => {
    h.auth.mockResolvedValue(false)
    ctx.session.pendingTz = 'America/Bogota'

    await bot.press('confirm_tz_yes', ctx)

    expect(h.update).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
  })

  it('error de BD al actualizar: limpia la sesión en vez de dejarla colgada', async () => {
    ctx.session.pendingTz = 'America/Bogota'
    h.update.mockRejectedValue(new Error('Fallo de Mongo'))

    await bot.press('confirm_tz_yes', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingTz).toBeNull()
  })
})
