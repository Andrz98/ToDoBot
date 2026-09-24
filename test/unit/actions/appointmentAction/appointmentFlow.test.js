import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => {
  const state = { findOne: vi.fn(), created: null }
  class Appointment {
    constructor(fields) {
      Object.assign(this, fields)
      this.save = vi.fn().mockResolvedValue(this)
      state.created = this
    }
    static findOne(...args) {
      return state.findOne(...args)
    }
  }
  return { state, Appointment, auth: vi.fn(), tz: vi.fn() }
})
vi.mock('@/models/appointment.js', () => ({
  Appointment: h.Appointment,
  FIELD_LIMITS: { client: 100, location: 200, notes: 500 }
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)

import {
  registerAppointmentFlow,
  startAppointment,
  openAppointmentEditor
} from '@/actions/appointmentAction/appointmentFlow.js'

// findOne se usa de dos formas: con .lean() (solapes) y esperado directamente (edición)
const query = (value) => ({
  lean: () => Promise.resolve(value),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
})

const FUTURE = '2099-06-01T10:00:00.000Z'
const PAST = '2000-01-01T10:00:00.000Z'
const callbacks = (extra) =>
  extra.reply_markup.inline_keyboard.flat().map((b) => b.callback_data)

const flowCtx = (pendingApt, extra = {}) =>
  makeCtx({
    session: { flowType: 'apt', menuMessageId: 5, pendingApt },
    ...extra
  })

describe('flujo /cita', () => {
  let bot
  beforeEach(() => {
    h.state.findOne.mockReset().mockReturnValue(query(null))
    h.state.created = null
    h.auth.mockReset().mockResolvedValue(true)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerAppointmentFlow(bot)
  })

  describe('abrir y rellenar', () => {
    it('/cita abre el menú vacío, sin botón de confirmar', async () => {
      const ctx = makeCtx()

      await bot.run('cita', ctx)

      expect(ctx.session.flowType).toBe('apt')
      expect(ctx.session.pendingApt).toEqual({})
      const [text, extra] = ctx.reply.mock.calls[0]
      expect(text).toContain('Nueva cita')
      expect(callbacks(extra)).toEqual(
        expect.arrayContaining(['apt_field_client', 'apt_cal', 'apt_dur'])
      )
      expect(callbacks(extra)).not.toContain('apt_confirm')
    })

    it('pide el cliente con force-reply y lo guarda al responder', async () => {
      const ctx = flowCtx({})
      await bot.press('apt_field_client', ctx)
      expect(ctx.session.awaiting).toBe('apt_client')
      expect(ctx.reply.mock.calls[0][1].reply_markup).toEqual({
        force_reply: true
      })

      const answer = flowCtx(
        {},
        { message: { text: '  Ana Pérez ', message_id: 9 } }
      )
      answer.session.awaiting = 'apt_client'
      await bot.say(answer)

      expect(answer.session.pendingApt.client).toBe('Ana Pérez')
      const [, , , text] = answer.telegram.editMessageText.mock.calls[0]
      expect(text).toContain('Ana Pérez')
    })

    it('con cliente e inicio aparece el botón de confirmar', async () => {
      const ctx = flowCtx({ client: 'Ana' })
      ctx.session.awaiting = 'apt_date'
      ctx.message = { text: '30/12/2099 10:30', message_id: 9 }

      await bot.say(ctx)

      expect(ctx.session.pendingApt.startAt).toEqual(
        new Date('2099-12-30T09:30:00Z') // 10:30 en Madrid (invierno, UTC+1)
      )
      const extra = ctx.telegram.editMessageText.mock.calls[0][4]
      expect(callbacks(extra)).toContain('apt_confirm')
    })

    it.each([
      ['un texto demasiado largo', 'apt_client', 'x'.repeat(101), 'Máximo 100'],
      [
        'una fecha sin hora',
        'apt_date',
        '30/12/2099',
        'la hora es obligatoria'
      ],
      ['una fecha inventada', 'apt_date', 'cuando pueda', 'Fecha inválida'],
      ['una fecha pasada', 'apt_date', '01/01/2000 10:00', 'debe ser futura'],
      ['una duración no numérica', 'apt_duration', 'mucho', 'minutos entre'],
      ['una duración fuera de rango', 'apt_duration', '2', 'minutos entre']
    ])(
      'rechaza %s y vuelve a preguntar',
      async (_name, awaiting, text, hint) => {
        const ctx = flowCtx({ client: 'Ana' })
        ctx.session.awaiting = awaiting
        ctx.message = { text, message_id: 9 }

        await bot.say(ctx)

        expect(ctx.reply.mock.calls[0][0]).toContain(hint)
        expect(ctx.session.pendingApt).toEqual({ client: 'Ana' })
        expect(ctx.session.awaiting).toBe(awaiting)
      }
    )

    it('una duración de la botonera se aplica y la personalizada se acepta', async () => {
      const ctx = flowCtx({ client: 'Ana' })
      await bot.press('apt_dur_90', ctx)
      expect(ctx.session.pendingApt.durationMin).toBe(90)

      ctx.session.awaiting = 'apt_duration'
      ctx.message = { text: '150', message_id: 9 }
      await bot.say(ctx)
      expect(ctx.session.pendingApt.durationMin).toBe(150)
    })

    it('un comando escrito a mitad de flujo no se toma como respuesta', async () => {
      const ctx = flowCtx({})
      ctx.session.awaiting = 'apt_client'
      ctx.message = { text: '/list', message_id: 9 }
      const next = vi.fn()

      await bot.say(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.session.pendingApt).toEqual({})
    })

    it('un flujo ajeno no es interceptado', async () => {
      const ctx = makeCtx({
        session: { flowType: 'add', awaiting: 'add_name', pendingTask: {} },
        message: { text: 'Comprar pan', message_id: 9 }
      })
      const next = vi.fn()

      await bot.say(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('avisa (sin bloquear) si la cita se solapa con otra', async () => {
      h.state.findOne.mockReturnValue(
        query({
          client: 'Luis',
          startAt: new Date('2099-06-01T09:30:00Z'),
          endAt: new Date('2099-06-01T10:30:00Z')
        })
      )
      const ctx = flowCtx({ client: 'Ana', startAt: FUTURE })

      await bot.press('apt_dur_30', ctx)

      const [, , , text, extra] = ctx.telegram.editMessageText.mock.calls[0]
      expect(text).toContain('⚠️ Se solapa con Luis')
      expect(callbacks(extra)).toContain('apt_confirm')
    })

    it('el solape no cuenta canceladas ni la propia cita en edición', async () => {
      const ctx = flowCtx({ id: 'abc', client: 'Ana', startAt: FUTURE })

      await bot.press('apt_dur_30', ctx)

      const filter = h.state.findOne.mock.calls[0][0]
      expect(filter).toMatchObject({
        userId: 7,
        status: { $ne: 'cancelled' },
        _id: { $ne: 'abc' }
      })
    })

    it('un fallo al buscar solapes no rompe el menú', async () => {
      h.state.findOne.mockReturnValue({
        lean: () => Promise.reject(new Error('db'))
      })
      const ctx = flowCtx({ client: 'Ana', startAt: FUTURE })

      await bot.press('apt_dur_30', ctx)

      expect(ctx.telegram.editMessageText).toHaveBeenCalled()
    })

    it('una interfaz antigua (no es la viva del flujo) caduca', async () => {
      const ctx = flowCtx(
        {},
        { callbackQuery: { message: { message_id: 99 } } }
      )

      await bot.press('apt_field_client', ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        'Esta acción ya no está disponible.'
      )
      expect(ctx.session.awaiting).toBeUndefined()
    })
  })

  describe('confirmar', () => {
    it('crea la cita del propio usuario con su duración y cierra el flujo', async () => {
      const ctx = flowCtx({
        client: 'Ana',
        startAt: FUTURE,
        durationMin: 90,
        location: 'Oficina'
      })

      await bot.press('apt_confirm', ctx)

      const created = h.state.created
      expect(created).toMatchObject({
        userId: 7,
        client: 'Ana',
        location: 'Oficina'
      })
      expect(created.startAt).toEqual(new Date(FUTURE))
      expect(created.endAt).toEqual(new Date('2099-06-01T11:30:00.000Z'))
      expect(created.save).toHaveBeenCalled()
      expect(created.gcalDirty).toBe(true)
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Cita creada.', {})
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Ana'),
        expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
      )
      expect(ctx.session.flowType).toBeUndefined()
      expect(ctx.session.pendingApt).toBeUndefined()
    })

    it('sin cliente o sin inicio no guarda', async () => {
      const ctx = flowCtx({ client: 'Ana' })

      await bot.press('apt_confirm', ctx)

      expect(h.state.created).toBeNull()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        'La sesión expiró. Usa /cita para empezar de nuevo.',
        { show_alert: true }
      )
    })

    it('un inicio que ya pasó mientras el menú seguía abierto no se guarda', async () => {
      const ctx = flowCtx({ client: 'Ana', startAt: PAST })

      await bot.press('apt_confirm', ctx)

      expect(h.state.created.save).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        'La fecha ya pasó. Elige otra.',
        { show_alert: true }
      )
      expect(ctx.session.flowType).toBe('apt')
    })

    it('usuario desautorizado a mitad de flujo: no guarda', async () => {
      h.auth.mockResolvedValue(false)
      const ctx = flowCtx({ client: 'Ana', startAt: FUTURE })

      await bot.press('apt_confirm', ctx)

      expect(h.state.created).toBeNull()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '🥸 Debes estar autorizado para usar este bot.',
        { show_alert: true }
      )
    })

    it('error de BD al guardar: limpia la sesión en vez de dejarla colgada', async () => {
      h.state.findOne.mockReturnValue(
        query({
          userId: 7,
          startAt: new Date(FUTURE),
          status: 'pending',
          save: vi.fn().mockRejectedValue(new Error('Fallo de Mongo'))
        })
      )
      const ctx = flowCtx({ id: 'abc', client: 'Ana', startAt: FUTURE })

      await bot.press('apt_confirm', ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
        { show_alert: true }
      )
      expect(ctx.session.flowType).toBeUndefined()
    })
  })

  describe('editar', () => {
    const existing = (extra = {}) => ({
      userId: 7,
      client: 'Ana',
      startAt: new Date(FUTURE),
      endAt: new Date('2099-06-01T11:00:00.000Z'),
      status: 'confirmed',
      alertsSent: ['24h'],
      reminderMessageId: 77,
      save: vi.fn().mockResolvedValue(undefined),
      ...extra
    })

    it('mover la cita la deja sin confirmar, reinicia sus alertas y retira su aviso', async () => {
      const appointment = existing()
      h.state.findOne.mockReturnValue(query(appointment))
      const ctx = flowCtx({
        id: 'abc',
        client: 'Ana',
        startAt: '2099-06-02T10:00:00.000Z',
        durationMin: 60
      })

      await bot.press('apt_confirm', ctx)

      expect(h.state.findOne).toHaveBeenCalledWith({
        _id: 'abc',
        userId: 7,
        status: { $ne: 'cancelled' }
      })
      expect(appointment.startAt).toEqual(new Date('2099-06-02T10:00:00.000Z'))
      expect(appointment.status).toBe('pending')
      expect(appointment.alertsSent).toEqual([])
      expect(appointment.reminderMessageId).toBeUndefined()
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 77)
      expect(appointment.save).toHaveBeenCalled()
      expect(appointment.gcalDirty).toBe(true)
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('👌🏽 Cita actualizada.', {})
    })

    it('cambiar solo notas o ubicación conserva estado, alertas y aviso', async () => {
      const appointment = existing()
      h.state.findOne.mockReturnValue(query(appointment))
      const ctx = flowCtx({
        id: 'abc',
        client: 'Ana',
        startAt: FUTURE,
        durationMin: 60,
        notes: 'Traer contrato'
      })

      await bot.press('apt_confirm', ctx)

      expect(appointment.notes).toBe('Traer contrato')
      expect(appointment.status).toBe('confirmed')
      expect(appointment.alertsSent).toEqual(['24h'])
      expect(appointment.reminderMessageId).toBe(77)
      expect(ctx.telegram.deleteMessage).not.toHaveBeenCalledWith(7, 77)
      expect(appointment.save).toHaveBeenCalled()
      expect(appointment.gcalDirty).toBe(true) // se refleja en Google
    })

    it('una cita cancelada o ajena entre medias: avisa y no guarda', async () => {
      h.state.findOne.mockReturnValue(query(null))
      const ctx = flowCtx({ id: 'abc', client: 'Ana', startAt: FUTURE })

      await bot.press('apt_confirm', ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Cita no encontrada.', {
        show_alert: true
      })
    })

    it('openAppointmentEditor carga la cita en el menú del flujo', async () => {
      const ctx = makeCtx({ session: {} })

      await openAppointmentEditor(ctx, {
        _id: 'abc',
        client: 'Ana',
        startAt: new Date(FUTURE),
        endAt: new Date('2099-06-01T11:30:00.000Z'),
        location: 'Oficina'
      })

      expect(ctx.session.flowType).toBe('apt')
      expect(ctx.session.pendingApt).toMatchObject({
        id: 'abc',
        client: 'Ana',
        durationMin: 90,
        location: 'Oficina'
      })
      const [, messageId, , text, extra] =
        ctx.telegram.editMessageText.mock.calls[0]
      expect(messageId).toBe(5) // el mensaje pulsado pasa a ser la interfaz
      expect(text).toContain('Editar cita')
      expect(callbacks(extra)).toContain('apt_confirm')
    })
  })

  it('cancelar descarta la cita y cierra el flujo', async () => {
    const ctx = flowCtx({ client: 'Ana' })

    await bot.press('apt_cancel', ctx)

    expect(h.state.created).toBeNull()
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Operación cancelada.',
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.session.flowType).toBeUndefined()
    expect(ctx.session.pendingApt).toBeUndefined()
  })

  it('startAppointment limpia restos de una edición de tareas', async () => {
    const ctx = makeCtx({ session: { editing: { id: 't' }, edits: { a: 1 } } })

    await startAppointment(ctx)

    expect(ctx.session.editing).toBeUndefined()
    expect(ctx.session.edits).toBeUndefined()
  })
})
