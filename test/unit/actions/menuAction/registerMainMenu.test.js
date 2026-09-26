import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ auth: vi.fn(), tz: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)

import { registerMainMenu } from '@/actions/menuAction/registerMainMenu.js'
import { TTL } from '@/utils/telegramUtils/messageLifecycle.js'
import { isCalendarEnabled } from '@/services/google/calendarClient.js'
import {
  menuActions,
  menuCommands,
  buildMainMenuKeyboard,
  buildCommandHelp,
  sendMainMenu
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
    expect(callbacks).toEqual(
      menuActions().map(({ command }) => `menu_${command}`)
    )
  })

  describe('/calendar (integración opcional)', () => {
    const callbacks = () =>
      buildMainMenuKeyboard()
        .reply_markup.inline_keyboard.flat()
        .map((b) => b.callback_data)

    afterEach(() => vi.unstubAllEnvs())

    const stubCredentials = ({ base64 = '', file = '' }) => {
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', base64)
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', file)
    }
    const offered = () => ({
      keyboard: callbacks().includes('menu_calendar'),
      actions: menuActions().some(({ command }) => command === 'calendar'),
      help: buildCommandHelp().includes('/calendar'),
      dropdown: menuCommands().some(({ command }) => command === 'calendar')
    })

    it('sin credenciales de Google no se ofrece ni en la ayuda ni en la botonera', () => {
      stubCredentials({})

      expect(offered()).toEqual({
        keyboard: false,
        actions: false,
        help: false,
        dropdown: false
      })
    })

    it('con la ruta de un archivo que no existe (el fallo de Render) no se ofrece', () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcal-'))
      stubCredentials({ file: join(dir, 'no-existe.json') })

      expect(isCalendarEnabled()).toBe(false)
      expect(offered()).toEqual({
        keyboard: false,
        actions: false,
        help: false,
        dropdown: false
      })
    })

    it('con credenciales válidas en un archivo aparece en todas partes', () => {
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' }
      })
      const file = join(mkdtempSync(join(tmpdir(), 'gcal-')), 'cuenta.json')
      writeFileSync(
        file,
        JSON.stringify({
          client_email: 'bot@proyecto.iam.gserviceaccount.com',
          private_key: privateKey
        })
      )
      stubCredentials({ file })

      expect(isCalendarEnabled()).toBe(true)
      expect(offered()).toEqual({
        keyboard: true,
        actions: true,
        help: true,
        dropdown: true
      })
    })
  })

  describe('desplegable "/" de Telegram (setMyCommands)', () => {
    it('publica /start y cada acción del menú, en orden', () => {
      expect(menuCommands().map(({ command }) => command)).toEqual([
        'start',
        ...menuActions().map(({ command }) => command)
      ])
    })

    it('cumple los límites de Telegram (nombre a-z0-9_, descripción 3-256)', () => {
      for (const { command, description } of menuCommands()) {
        expect(command).toMatch(/^[a-z0-9_]{1,32}$/)
        expect(description.length).toBeGreaterThanOrEqual(3)
        expect(description.length).toBeLessThanOrEqual(256)
      }
    })

    it('incluye cita y agenda', () => {
      const commands = menuCommands().map(({ command }) => command)

      expect(commands).toContain('cita')
      expect(commands).toContain('agenda')
    })
  })

  describe('sendMainMenu', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    })
    afterEach(() => vi.useRealTimers())

    it('envía el menú con botones, lo guarda como el vivo y borra el anterior después', async () => {
      const ctx = makeCtx({ session: { startMessageId: 3 } })

      await sendMainMenu(ctx)

      const [text, extra] = ctx.reply.mock.calls[0]
      expect(text).toContain('Hola')
      expect(text).toContain('se limpia solo')
      expect(extra.reply_markup.inline_keyboard.flat().length).toBe(
        menuActions().length
      )
      expect(ctx.session.startMessageId).toBe(6)
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 3)
      expect(ctx.reply.mock.invocationCallOrder[0]).toBeLessThan(
        ctx.telegram.deleteMessage.mock.invocationCallOrder[0]
      )
    })

    it('no caduca: pasado el plazo de una interfaz sigue en el chat', async () => {
      const ctx = makeCtx({ session: {} })

      await sendMainMenu(ctx)
      await vi.advanceTimersByTimeAsync(TTL.INTERFACE * 2)

      expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    })

    it('si el envío falla, conserva el menú anterior', async () => {
      const ctx = makeCtx({ session: { startMessageId: 3 } })
      ctx.reply.mockRejectedValue(new Error('boom'))

      await expect(sendMainMenu(ctx)).rejects.toThrow('boom')

      expect(ctx.session.startMessageId).toBe(3)
      expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
    })
  })
})
