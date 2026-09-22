import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../support/telegram.js'

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  tz: vi.fn(),
  findOne: vi.fn(),
  keyboard: vi.fn(),
  findById: vi.fn()
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)
vi.mock('@/models/authorizedUser.js', () => ({
  AuthorizedUser: { findOne: h.findOne, findOneAndUpdate: vi.fn() }
}))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock('@/helpers/taskHelpers/edit/taskSelection.js', () => ({
  getTaskSelectionKeyboard: h.keyboard
}))
vi.mock('@/middlewares/access/isAuthorizedUser.js', () => ({
  isAuthorizedUser: (_ctx, next) => next()
}))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({ flashReply: vi.fn() }))

import { flowGuard } from '@/middlewares/flowControl/flowGuard.js'
import { startCommand } from '@/controllers/startController/startController.js'
import { setTimezone } from '@/controllers/timeZoneController/setTimezone.js'
import { registerTimezoneActions } from '@/actions/timezoneAction/timezoneActionHandlers.js'
import { registerStartEditAction } from '@/actions/editAction/startEditAction.js'
import { registerForceReplyHandler } from '@/events/editForceReply/editForceReplyHandler.js'

const SECRET = 'DATO-PRIVADO-123'

// Con DEBUG=true el bot registra trazas; no deben incluir sesión, mensajes ni datos del usuario
describe('DEBUG=true: los logs no filtran datos de usuario', () => {
  let log, captured
  beforeEach(() => {
    captured = []
    vi.stubEnv('DEBUG', 'true')
    log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      captured.push(JSON.stringify(args))
    })
    h.auth.mockReset().mockResolvedValue(true)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    h.findOne.mockReset().mockResolvedValue({ timezone: 'Europe/Madrid' })
    h.keyboard.mockReset().mockResolvedValue({ reply_markup: {} })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })
  const logged = () => captured.join(' | ')

  it('flowGuard (bloqueo, forceReply y comando nuevo)', async () => {
    const run = (session, text) =>
      flowGuard({ session, message: { text }, reply: vi.fn() }, vi.fn())

    await run({ flowType: 'delete' }, SECRET) // bloqueado
    await run({ flowType: 'add', awaiting: 'add_name' }, SECRET) // forceReply
    await run({ flowType: 'delete' }, `/edit ${SECRET}`) // comando nuevo

    expect(log).toHaveBeenCalled() // el modo DEBUG sigue trazando el flujo
    expect(logged()).not.toContain(SECRET)
  })

  it('/start', async () => {
    const ctx = {
      from: { id: 424242, first_name: SECRET, username: `${SECRET}-user` },
      reply: vi.fn()
    }

    await startCommand(ctx)

    expect(logged()).not.toContain(SECRET)
    expect(logged()).not.toContain('424242')
  })

  it('/settimezone', async () => {
    const ctx = makeCtx({
      from: { id: 424242 },
      message: { text: '/settimezone' },
      session: { pendingTask: { name: SECRET } }
    })

    await setTimezone(ctx)

    expect(logged()).not.toContain(SECRET)
  })

  it('botón de zona horaria', async () => {
    const bot = makeFakeBot()
    registerTimezoneActions(bot)
    const ctx = makeCtx({ session: { pendingTask: { name: SECRET } } })

    await bot.press('set_tz_America/Bogota', ctx)

    expect(logged()).not.toContain(SECRET)
  })

  it('/edit', async () => {
    const bot = makeFakeBot()
    registerStartEditAction(bot)
    const ctx = makeCtx({
      session: { pendingTask: { name: SECRET }, editing: { oldName: SECRET } }
    })

    await bot.run('edit', ctx)

    expect(logged()).not.toContain(SECRET)
  })

  it('respuestas de edición (texto libre y comandos)', async () => {
    const bot = makeFakeBot()
    registerForceReplyHandler(bot)

    await bot.say(makeCtx({ message: { text: SECRET }, session: {} }))
    await bot.say(
      makeCtx({ message: { text: `/edit ${SECRET}` }, session: {} })
    )

    expect(logged()).not.toContain(SECRET)
  })
})
