import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => {
  class GoogleApiError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  }
  return {
    GoogleApiError,
    enabled: vi.fn(),
    createCalendar: vi.fn(),
    shareCalendar: vi.fn(),
    deleteCalendar: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
    updateMany: vi.fn(),
    auth: vi.fn(),
    tz: vi.fn()
  }
})
vi.mock('@/models/appointment.js', () => ({
  Appointment: { updateMany: h.updateMany }
}))
vi.mock('@/services/google/calendarClient.js', () => ({
  GoogleApiError: h.GoogleApiError,
  isCalendarEnabled: h.enabled,
  createCalendar: h.createCalendar,
  shareCalendar: h.shareCalendar,
  deleteCalendar: h.deleteCalendar
}))
vi.mock('@/models/calendarLink.js', () => ({
  CalendarLink: {
    findOne: h.findOne,
    create: h.create,
    deleteOne: h.deleteOne
  }
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)

import {
  registerCalendarActions,
  showCalendar
} from '@/actions/calendarAction/calendarActions.js'

const LINK = {
  _id: 'l1',
  userId: 7,
  email: 'ana@gmail.com',
  calendarId: 'cal-1@group.calendar.google.com'
}
const lean = (value) => ({ lean: () => Promise.resolve(value) })
const callbacks = (extra) =>
  extra.reply_markup.inline_keyboard.flat().map((b) => b.callback_data)
const painted = (ctx) => ctx.editMessageText.mock.calls.at(-1)

const flowCtx = (pendingCal, extra = {}) =>
  makeCtx({
    session: { flowType: 'cal', menuMessageId: 5, pendingCal },
    from: { id: 7, first_name: 'Andrés' },
    ...extra
  })

describe('/calendar', () => {
  let bot
  beforeEach(() => {
    Object.values(h)
      .filter((value) => typeof value?.mockReset === 'function')
      .forEach((fn) => fn.mockReset())
    h.enabled.mockReturnValue(true)
    h.findOne.mockReturnValue(lean(null))
    h.createCalendar.mockResolvedValue('cal-1@group.calendar.google.com')
    h.shareCalendar.mockResolvedValue(undefined)
    h.deleteCalendar.mockResolvedValue(undefined)
    h.create.mockResolvedValue(undefined)
    h.deleteOne.mockResolvedValue(undefined)
    h.updateMany.mockResolvedValue({})
    h.auth.mockResolvedValue(true)
    h.tz.mockResolvedValue('Europe/Madrid')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerCalendarActions(bot)
  })

  describe('abrir', () => {
    it('sin credenciales de Google avisa y no toca la base de datos', async () => {
      h.enabled.mockReturnValue(false)
      const ctx = makeCtx({ session: {} })

      await bot.run('calendar', ctx)

      expect(ctx.reply.mock.calls[0][0]).toContain('no está configurado')
      expect(h.findOne).not.toHaveBeenCalled()
    })

    it('sin conectar inicia el flujo y pide el correo con force-reply', async () => {
      const ctx = makeCtx({ session: { editing: { id: 't' } } })

      await bot.run('calendar', ctx)

      expect(h.findOne).toHaveBeenCalledWith({ userId: 7 })
      expect(ctx.session).toMatchObject({
        flowType: 'cal',
        pendingCal: {},
        awaiting: 'cal_email'
      })
      expect(ctx.session.editing).toBeUndefined()
      const [intro, prompt] = ctx.reply.mock.calls
      expect(intro[0]).toContain('Conectar Google Calendar')
      expect(callbacks(intro[1])).toEqual(['cal_cancel'])
      expect(prompt[1].reply_markup).toEqual({ force_reply: true })
    })

    it('conectado muestra el estado y sustituye a la pantalla anterior', async () => {
      h.findOne.mockReturnValue(lean(LINK))
      const ctx = makeCtx({ session: { calendarMessageId: 40 } })

      await bot.run('calendar', ctx)

      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 40)
      const [text, extra] = ctx.reply.mock.calls[0]
      expect(text).toContain('Google Calendar conectado')
      expect(text).toContain('ana@gmail.com')
      expect(callbacks(extra)).toContain('cal_disconnect')
      expect(ctx.session.calendarMessageId).toBe(6)
      expect(ctx.session.flowType).toBeUndefined()
    })

    it('un error de BD avisa sin lanzar', async () => {
      h.findOne.mockImplementation(() => {
        throw new Error('db')
      })
      const ctx = makeCtx({ session: {} })

      await expect(showCalendar(ctx)).resolves.not.toThrow()

      expect(ctx.reply.mock.calls[0][0]).toContain(
        'error al abrir Google Calendar'
      )
    })
  })

  describe('correo', () => {
    it('un correo válido se normaliza y pasa a la confirmación', async () => {
      const ctx = flowCtx(
        {},
        { message: { text: '  Ana@Gmail.COM ', message_id: 9 } }
      )
      ctx.session.awaiting = 'cal_email'

      await bot.say(ctx)

      expect(ctx.session.pendingCal.email).toBe('ana@gmail.com')
      expect(ctx.session.awaiting).toBeNull()
      const [, , , text, extra] = ctx.telegram.editMessageText.mock.calls[0]
      expect(text).toContain('📧 ana@gmail.com')
      expect(callbacks(extra)).toEqual([
        'cal_confirm',
        'cal_change',
        'cal_cancel'
      ])
    })

    it('un correo inválido vuelve a preguntar y no avanza', async () => {
      const ctx = flowCtx(
        {},
        { message: { text: 'no-es-un-correo', message_id: 9 } }
      )
      ctx.session.awaiting = 'cal_email'

      await bot.say(ctx)

      expect(ctx.reply.mock.calls[0][0]).toContain('no parece válido')
      expect(ctx.session.pendingCal.email).toBeUndefined()
      expect(ctx.session.awaiting).toBe('cal_email')
    })

    it('un comando escrito a mitad de flujo no se toma como correo', async () => {
      const ctx = flowCtx({}, { message: { text: '/list', message_id: 9 } })
      ctx.session.awaiting = 'cal_email'
      const next = vi.fn()

      await bot.say(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.session.pendingCal.email).toBeUndefined()
    })

    it('un flujo ajeno no es interceptado', async () => {
      const ctx = makeCtx({
        session: { flowType: 'add', awaiting: 'add_name', pendingTask: {} },
        message: { text: 'ana@gmail.com', message_id: 9 }
      })
      const next = vi.fn()

      await bot.say(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('cambiar correo vuelve a pedirlo', async () => {
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_change', ctx)

      expect(ctx.session.awaiting).toBe('cal_email')
      expect(ctx.reply.mock.calls[0][1].reply_markup).toEqual({
        force_reply: true
      })
    })
  })

  describe('conectar', () => {
    it('crea el calendario con la zona del usuario, lo comparte y muestra el estado', async () => {
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.createCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: 'TuttoFatto — Andrés',
          timeZone: 'Europe/Madrid'
        })
      )
      expect(h.shareCalendar).toHaveBeenCalledWith(
        'cal-1@group.calendar.google.com',
        'ana@gmail.com'
      )
      expect(h.create).toHaveBeenCalledWith({
        userId: 7,
        email: 'ana@gmail.com',
        calendarId: 'cal-1@group.calendar.google.com'
      })
      // Mientras Google trabaja, el mensaje se queda sin botones
      expect(ctx.editMessageText.mock.calls[0]).toEqual([
        '⏳ Conectando con Google…',
        expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
      ])
      const [text, extra] = painted(ctx)
      expect(text).toContain('Google Calendar conectado')
      expect(callbacks(extra)).toContain('cal_disconnect')
      // El mensaje del flujo pasa a ser la pantalla de estado
      expect(ctx.session.flowType).toBeUndefined()
      expect(ctx.session.pendingCal).toBeUndefined()
      expect(ctx.session.menuMessageId).toBeUndefined()
      expect(ctx.session.calendarMessageId).toBe(5)
    })

    it('encola las citas que ya existen (no canceladas) para enviarlas al calendario nuevo', async () => {
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.updateMany).toHaveBeenCalledWith(
        { userId: 7, status: { $ne: 'cancelled' } },
        { gcalDirty: true }
      )
    })

    it('la sincronización inicial no se encola si la conexión falla', async () => {
      h.shareCalendar.mockRejectedValue(
        new h.GoogleApiError(400, 'Invalid scope')
      )
      const ctx = flowCtx({ email: 'x@example.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.updateMany).not.toHaveBeenCalled()
    })

    it('si encolar la sincronización inicial falla, la conexión sigue adelante', async () => {
      h.updateMany.mockRejectedValue(new Error('db'))
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_confirm', ctx)

      expect(painted(ctx)[0]).toContain('Google Calendar conectado')
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('sincronización inicial'),
        expect.any(Error)
      )
    })

    it('si Google rechaza el correo, borra el calendario creado y deja reintentar', async () => {
      h.shareCalendar.mockRejectedValue(
        new h.GoogleApiError(400, 'Invalid scope')
      )
      const ctx = flowCtx({ email: 'x@example.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.deleteCalendar).toHaveBeenCalledWith(
        'cal-1@group.calendar.google.com'
      )
      expect(h.create).not.toHaveBeenCalled()
      const [, , , text, extra] = ctx.telegram.editMessageText.mock.calls[0]
      expect(text).toContain('Google no acepta ese correo')
      expect(callbacks(extra)).toContain('cal_confirm')
      expect(ctx.session.flowType).toBe('cal')
    })

    it('un fallo de Google al crear no deja nada que borrar', async () => {
      h.createCalendar.mockRejectedValue(new h.GoogleApiError(503, 'caído'))
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.shareCalendar).not.toHaveBeenCalled()
      expect(h.deleteCalendar).not.toHaveBeenCalled()
      expect(ctx.telegram.editMessageText.mock.calls[0][3]).toContain(
        'No pude conectar con Google'
      )
    })

    it('si ya estaba conectado (índice único), no deja un segundo calendario', async () => {
      h.create.mockRejectedValue(
        Object.assign(new Error('dup'), { code: 11000 })
      )
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.deleteCalendar).toHaveBeenCalledWith(
        'cal-1@group.calendar.google.com'
      )
      expect(ctx.telegram.editMessageText.mock.calls[0][3]).toContain(
        'Ya tienes Google Calendar conectado'
      )
    })

    it('si además falla la limpieza, lo registra y sigue informando al usuario', async () => {
      h.shareCalendar.mockRejectedValue(
        new h.GoogleApiError(400, 'Invalid scope')
      )
      h.deleteCalendar.mockRejectedValue(new Error('Google caído'))
      const ctx = flowCtx({ email: 'x@example.com' })

      await bot.press('cal_confirm', ctx)

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Calendario huérfano cal-1@group.calendar.google.com'
        ),
        'Google caído'
      )
      expect(ctx.telegram.editMessageText.mock.calls[0][3]).toContain(
        'Google no acepta ese correo'
      )
    })

    it('usuario desautorizado a mitad de flujo: no crea nada', async () => {
      h.auth.mockResolvedValue(false)
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_confirm', ctx)

      expect(h.createCalendar).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '🥸 Debes estar autorizado para usar este bot.',
        { show_alert: true }
      )
    })

    it('sin correo o con la sesión caducada no crea nada', async () => {
      const ctx = flowCtx({})

      await bot.press('cal_confirm', ctx)

      expect(h.createCalendar).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        'La sesión expiró. Usa /calendar para empezar de nuevo.',
        { show_alert: true }
      )
    })

    it('una interfaz antigua (no es la viva del flujo) caduca', async () => {
      const ctx = flowCtx(
        { email: 'ana@gmail.com' },
        { callbackQuery: { message: { message_id: 99 } } }
      )

      await bot.press('cal_confirm', ctx)

      expect(h.createCalendar).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        'Esta acción ya no está disponible.'
      )
    })

    it('cancelar cierra el flujo sin llamar a Google', async () => {
      const ctx = flowCtx({ email: 'ana@gmail.com' })

      await bot.press('cal_cancel', ctx)

      expect(h.createCalendar).not.toHaveBeenCalled()
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        'Operación cancelada.',
        expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
      )
      expect(ctx.session.flowType).toBeUndefined()
      expect(ctx.session.pendingCal).toBeUndefined()
    })
  })

  describe('desconectar', () => {
    beforeEach(() => h.findOne.mockReturnValue(lean(LINK)))

    it('pide confirmación antes de tocar nada', async () => {
      const ctx = makeCtx({ session: {} })

      await bot.press('cal_disconnect', ctx)

      expect(h.deleteCalendar).not.toHaveBeenCalled()
      const [text, extra] = painted(ctx)
      expect(text).toContain('¿Desconectar <b>ana@gmail.com</b>?')
      expect(callbacks(extra)).toEqual(['cal_disconnect_yes', 'cal_back'])
    })

    it('volver repinta el estado', async () => {
      const ctx = makeCtx({ session: {} })

      await bot.press('cal_back', ctx)

      expect(painted(ctx)[0]).toContain('Google Calendar conectado')
    })

    it('confirmar borra el calendario de Google y luego el vínculo', async () => {
      const ctx = makeCtx({ session: { calendarMessageId: 5 } })

      await bot.press('cal_disconnect_yes', ctx)

      expect(h.deleteCalendar).toHaveBeenCalledWith(
        'cal-1@group.calendar.google.com'
      )
      expect(h.deleteOne).toHaveBeenCalledWith({ _id: 'l1' })
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '🔌 Google Calendar desconectado.',
        {}
      )
      expect(painted(ctx)[0]).toBe('🔌 Google Calendar desconectado.')
      expect(ctx.session.calendarMessageId).toBeUndefined()
    })

    it('si Google no llega a borrarlo, conserva el vínculo para poder reintentar', async () => {
      h.deleteCalendar.mockRejectedValue(
        new h.GoogleApiError(500, 'sigue existiendo')
      )
      const ctx = makeCtx({ session: {} })

      await bot.press('cal_disconnect_yes', ctx)

      expect(h.deleteOne).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
        { show_alert: true }
      )
    })

    it('un vínculo ya inexistente no rompe nada', async () => {
      h.findOne.mockReturnValue(lean(null))
      const ctx = makeCtx({ session: {} })

      await bot.press('cal_disconnect_yes', ctx)

      expect(h.deleteCalendar).not.toHaveBeenCalled()
      expect(painted(ctx)[0]).toBe('🔌 Google Calendar desconectado.')
    })

    it.each(['cal_disconnect', 'cal_back', 'cal_disconnect_yes'])(
      '%s exige usuario autorizado',
      async (data) => {
        h.auth.mockResolvedValue(false)
        const ctx = makeCtx({ session: {} })

        await bot.press(data, ctx)

        expect(h.findOne).not.toHaveBeenCalled()
        expect(h.deleteCalendar).not.toHaveBeenCalled()
        expect(ctx.answerCbQuery).toHaveBeenCalledWith(
          '🥸 Debes estar autorizado para usar este bot.',
          { show_alert: true }
        )
      }
    )
  })
})
