import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../support/telegram.js'

const h = vi.hoisted(() => ({ findById: vi.fn(), tz: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { registerForceReplyHandler } from '@/events/editForceReply/editForceReplyHandler.js'

const editCtx = (awaiting, text, session = {}) =>
  makeCtx({
    message: {
      text,
      message_id: 20,
      reply_to_message: { message_id: 15 }
    },
    session: {
      flowType: 'edit',
      awaiting,
      editing: { id: 't1', oldName: 'Pagar luz' },
      edits: {},
      menuMessageId: 10,
      ...session
    }
  })

describe('/edit: respuestas de texto', () => {
  let bot, task
  beforeEach(() => {
    task = {
      name: 'Pagar luz',
      description: 'urgente',
      reminderAt: new Date('2099-01-01T00:00:00Z')
    }
    h.findById.mockReset().mockResolvedValue(task)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerForceReplyHandler(bot)
  })

  it('aplica un nuevo nombre editando el menú en sitio, sin mensajes nuevos', async () => {
    const ctx = editCtx('new_name', 'Pagar gas')

    await bot.say(ctx)

    expect(task.name).toBe('Pagar gas')
    expect(ctx.session.awaiting).toBeNull()
    // Borra el prompt de force-reply y la respuesta del usuario
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 15)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 20)
    // Un único mensaje editado, ninguno nuevo
    expect(ctx.reply).not.toHaveBeenCalled()
    const [chatId, messageId, , finalText] =
      ctx.telegram.editMessageText.mock.calls[0]
    expect(chatId).toBe(99)
    expect(messageId).toBe(10)
    expect(finalText).toContain('Cambio aplicado')
    expect(finalText).toContain('Pagar gas')
  })

  it('interpreta la nueva fecha en la zona horaria del usuario', async () => {
    h.tz.mockResolvedValue('America/Bogota')
    const ctx = editCtx('new_date', '25/12/2099 10:00')

    await bot.say(ctx)

    expect(task.reminderAt.toISOString()).toBe('2099-12-25T15:00:00.000Z')
  })

  it('sin cambios reales: edita el menú con el aviso, sin mensajes nuevos', async () => {
    const ctx = editCtx('new_name', 'Pagar luz') // igual al actual

    await bot.say(ctx)

    expect(ctx.reply).not.toHaveBeenCalled()
    const [, , , finalText] = ctx.telegram.editMessageText.mock.calls[0]
    expect(finalText).toContain('No hubo cambios')
  })

  it('una fecha pasada avisa y mantiene el flujo de edición', async () => {
    const ctx = editCtx('new_date', '01/01/2000 10:00')

    await bot.say(ctx)

    expect(ctx.reply).toHaveBeenCalledWith('⌚ La nueva fecha debe ser futura.')
    expect(ctx.session.editing).toEqual({ id: 't1', oldName: 'Pagar luz' })
    expect(ctx.session.awaiting).toBe('new_date')
    expect(ctx.session.flowType).toBe('edit')
  })

  it('error externo simulado (BD caída): limpia toda la sesión sin lanzar', async () => {
    h.findById.mockRejectedValue(new Error('Fallo de Mongo'))
    const ctx = editCtx('new_name', 'Pagar gas')

    await expect(bot.say(ctx)).resolves.not.toThrow()

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.'
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.editing).toBeNull()
    expect(ctx.session.awaiting).toBeNull()
    expect(ctx.session.menuMessageId).toBeNull()
  })
})
