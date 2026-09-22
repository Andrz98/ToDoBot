import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))

import { registerMainMenu } from '@/actions/menuAction/registerMainMenu.js'
import {
  MENU_ACTIONS,
  buildMainMenuKeyboard,
  buildCommandHelp
} from '@/helpers/menu/mainMenu.js'

describe('menú principal', () => {
  let bot, handlers, ctx
  beforeEach(() => {
    h.auth.mockReset().mockResolvedValue(true)
    handlers = { add: vi.fn(), reminder: vi.fn() }
    bot = makeFakeBot()
    registerMainMenu(bot, handlers)
    ctx = makeCtx()
  })

  it('un botón ejecuta el mismo handler que su comando', async () => {
    await bot.press('menu_reminder', ctx)

    expect(handlers.reminder).toHaveBeenCalledWith(ctx)
  })

  it('exige autorización igual que el comando escrito', async () => {
    h.auth.mockResolvedValue(false)

    await bot.press('menu_add', ctx)

    expect(handlers.add).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
  })

  it('una acción desconocida no rompe nada', async () => {
    await bot.press('menu_hack', ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Acción no disponible.', {
      show_alert: true
    })
  })

  it('/reminder aparece en la ayuda y en la botonera', () => {
    const callbacks = buildMainMenuKeyboard()
      .reply_markup.inline_keyboard.flat()
      .map((b) => b.callback_data)

    expect(buildCommandHelp()).toContain('/reminder')
    expect(callbacks).toEqual(MENU_ACTIONS.map(({ command }) => `menu_${command}`))
  })
})
