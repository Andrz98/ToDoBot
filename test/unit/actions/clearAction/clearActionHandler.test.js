import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ deleteMany: vi.fn(), auth: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: { deleteMany: h.deleteMany } }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerClearActions } from '@/actions/clearAction/clearActionHandler.js'

describe('/clear: confirmación', () => {
  let bot, ctx
  beforeEach(() => {
    h.deleteMany.mockReset().mockResolvedValue({ deletedCount: 2 })
    h.auth.mockReset().mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerClearActions(bot)
    ctx = makeCtx({
      session: { flowType: 'clear', pendingClearToken: 'tok-1' }
    })
  })

  it('"Sí" con token válido borra solo las tareas completadas del usuario y resuelve el mensaje en sitio', async () => {
    await bot.press('clear_confirm_tok-1:yes', ctx)

    expect(h.deleteMany).toHaveBeenCalledWith({ userId: 7, completed: true })
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingClearToken).toBeNull()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Tareas eliminadas.', {})
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      '✅ Tareas eliminadas.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
  })

  it('con un token que no coincide no borra nada', async () => {
    await bot.press('clear_confirm_otro:yes', ctx)

    expect(h.deleteMany).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Operación inválida o expirada.',
      { show_alert: true }
    )
  })

  it('"No" cancela, limpia el flujo y resuelve el mensaje en sitio', async () => {
    await bot.press('clear_confirm_tok-1:no', ctx)

    expect(h.deleteMany).not.toHaveBeenCalled()
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingClearToken).toBeNull()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Acción finalizada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
  })

  it('doble-tap: el token ya consumido no vuelve a borrar', async () => {
    await bot.press('clear_confirm_tok-1:yes', ctx)
    h.deleteMany.mockClear()

    await bot.press('clear_confirm_tok-1:yes', ctx)

    expect(h.deleteMany).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Operación inválida o expirada.',
      { show_alert: true }
    )
  })

  it('usuario desautorizado a mitad de flujo: no borra', async () => {
    h.auth.mockResolvedValue(false)

    await bot.press('clear_confirm_tok-1:yes', ctx)

    expect(h.deleteMany).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
  })

  it('error de BD al borrar: limpia la sesión en vez de dejarla colgada', async () => {
    h.deleteMany.mockRejectedValue(new Error('Fallo de Mongo'))

    await bot.press('clear_confirm_tok-1:yes', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.pendingClearToken).toBeNull()
  })
})
