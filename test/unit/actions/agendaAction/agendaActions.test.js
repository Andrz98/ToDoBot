import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
  auth: vi.fn(),
  tz: vi.fn(),
  editor: vi.fn()
}))
vi.mock('@/models/appointment.js', () => ({
  Appointment: {
    find: h.find,
    findOne: h.findOne,
    updateOne: h.updateOne
  }
}))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)
vi.mock('@/actions/appointmentAction/appointmentFlow.js', () => ({
  openAppointmentEditor: h.editor
}))

import {
  registerAgendaActions,
  showAgenda
} from '@/actions/agendaAction/agendaActions.js'

const ID = '0123456789abcdef01234567'
const appointment = (extra = {}) => ({
  _id: ID,
  userId: 7,
  client: 'Ana',
  location: 'Oficina',
  startAt: new Date('2099-06-01T08:00:00Z'), // 10:00 en Madrid
  endAt: new Date('2099-06-01T09:00:00Z'),
  status: 'pending',
  reminderMessageId: 77,
  ...extra
})

// find(...).sort(...).lean() y findOne(...).lean()
const chain = (value) => ({
  sort: () => ({ lean: () => Promise.resolve(value) }),
  lean: () => Promise.resolve(value)
})
const callbacks = (extra) =>
  extra.reply_markup.inline_keyboard.flat().map((b) => b.callback_data)
const painted = (ctx) => ctx.editMessageText.mock.calls.at(-1)

describe('/agenda', () => {
  let bot, ctx
  beforeEach(() => {
    h.find.mockReset().mockReturnValue(chain([appointment()]))
    h.findOne.mockReset().mockReturnValue(chain(appointment()))
    h.updateOne.mockReset().mockResolvedValue({ modifiedCount: 1 })
    h.auth.mockReset().mockResolvedValue(true)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    h.editor.mockReset().mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    registerAgendaActions(bot)
    ctx = makeCtx({ session: {} })
  })

  describe('comando', () => {
    it('muestra las citas de hoy del propio usuario, no canceladas', async () => {
      await bot.run('agenda', ctx)

      const filter = h.find.mock.calls[0][0]
      expect(filter).toMatchObject({
        userId: 7,
        status: { $ne: 'cancelled' }
      })
      expect(filter.startAt.$lt - filter.startAt.$gte).toBe(24 * 60 * 60 * 1000)
      const [text, extra] = ctx.reply.mock.calls[0]
      expect(text).toContain('Agenda · Hoy (1)')
      expect(callbacks(extra)).toContain(`agenda_d:${ID}:today:0`)
      expect(ctx.session.agendaMessageId).toBe(6)
    })

    it('pedirla de nuevo sustituye a la anterior', async () => {
      ctx.session.agendaMessageId = 40

      await bot.run('agenda', ctx)

      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 40)
      expect(ctx.session.agendaMessageId).toBe(6)
    })

    it('sin citas ofrece crear una', async () => {
      h.find.mockReturnValue(chain([]))

      await bot.run('agenda', ctx)

      const [text, extra] = ctx.reply.mock.calls[0]
      expect(text).toContain('No tienes citas')
      expect(callbacks(extra)).toContain('menu_cita')
    })

    it('un error de BD avisa sin lanzar', async () => {
      h.find.mockImplementation(() => {
        throw new Error('db')
      })

      await expect(bot.run('agenda', ctx)).resolves.not.toThrow()

      expect(ctx.reply.mock.calls[0][0]).toContain('error al mostrar tu agenda')
    })
  })

  describe('navegar', () => {
    it('cambiar de pestaña repinta el mismo mensaje con el periodo pedido', async () => {
      await bot.press('agenda_r:week:0', ctx)

      const { $gte, $lt } = h.find.mock.calls[0][0].startAt
      expect($lt - $gte).toBe(7 * 24 * 60 * 60 * 1000)
      expect(painted(ctx)[0]).toContain('Agenda · Semana')
      expect(ctx.reply).not.toHaveBeenCalled()
    })

    it('el detalle muestra la cita y sus acciones', async () => {
      await bot.press(`agenda_d:${ID}:today:0`, ctx)

      expect(h.findOne).toHaveBeenCalledWith({
        _id: ID,
        userId: 7,
        status: { $ne: 'cancelled' }
      })
      const [text, extra] = painted(ctx)
      expect(text).toContain('<b>Ana</b>')
      expect(text).toContain('Oficina')
      expect(callbacks(extra)).toEqual([
        `agenda_ok:${ID}:today:0`,
        `agenda_ed:${ID}`,
        `agenda_no:${ID}:today:0`,
        'agenda_r:today:0'
      ])
    })

    it('una cita ya cancelada o ajena: avisa y vuelve a la agenda', async () => {
      h.findOne.mockReturnValue(chain(null))

      await bot.press(`agenda_d:${ID}:today:0`, ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Cita no encontrada.', {
        show_alert: true
      })
      expect(painted(ctx)[0]).toContain('Agenda · Hoy')
    })
  })

  describe('acciones', () => {
    it('confirmar marca la cita y repinta el detalle ya confirmado', async () => {
      await bot.press(`agenda_ok:${ID}:today:0`, ctx)

      expect(h.updateOne).toHaveBeenCalledWith(
        { _id: ID },
        { status: 'confirmed', gcalDirty: true }
      )
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Cita confirmada.', {})
      const [text, extra] = painted(ctx)
      expect(text).toContain('Confirmada')
      expect(callbacks(extra)).not.toContain(`agenda_ok:${ID}:today:0`)
    })

    it('cancelar pide confirmación antes de tocar nada', async () => {
      await bot.press(`agenda_no:${ID}:today:0`, ctx)

      expect(h.updateOne).not.toHaveBeenCalled()
      const [text, extra] = painted(ctx)
      expect(text).toContain('¿Cancelar la cita con <b>Ana</b>?')
      expect(callbacks(extra)).toEqual([
        `agenda_yes:${ID}:today:0`,
        `agenda_d:${ID}:today:0`
      ])
    })

    it('confirmar la cancelación la cancela, retira su aviso y vuelve a la agenda', async () => {
      h.find.mockReturnValue(chain([]))

      await bot.press(`agenda_yes:${ID}:today:0`, ctx)

      expect(h.updateOne).toHaveBeenCalledWith(
        { _id: ID },
        { status: 'cancelled', gcalDirty: true }
      )
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 77)
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Cita cancelada.', {})
      expect(painted(ctx)[0]).toContain('Agenda · Hoy (0)')
    })

    it('editar abre la cita en el flujo y suelta la agenda viva', async () => {
      ctx.session.agendaMessageId = 5

      await bot.press(`agenda_ed:${ID}`, ctx)

      expect(h.editor).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ _id: ID })
      )
      expect(ctx.session.agendaMessageId).toBeUndefined()
    })

    it('editar una cita que ya no existe avisa y no abre el flujo', async () => {
      h.findOne.mockReturnValue(chain(null))

      await bot.press(`agenda_ed:${ID}`, ctx)

      expect(h.editor).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Cita no encontrada.', {
        show_alert: true
      })
    })
  })

  describe('seguridad', () => {
    it.each([
      `agenda_r:today:0`,
      `agenda_d:${ID}:today:0`,
      `agenda_ok:${ID}:today:0`,
      `agenda_yes:${ID}:today:0`,
      `agenda_ed:${ID}`
    ])('%s exige usuario autorizado', async (data) => {
      h.auth.mockResolvedValue(false)

      await bot.press(data, ctx)

      expect(h.find).not.toHaveBeenCalled()
      expect(h.findOne).not.toHaveBeenCalled()
      expect(h.updateOne).not.toHaveBeenCalled()
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '🥸 Debes estar autorizado para usar este bot.',
        { show_alert: true }
      )
    })

    it('un id o periodo mal formados no llegan a ningún handler', async () => {
      await expect(bot.press('agenda_ok:xyz:today:0', ctx)).rejects.toThrow()
      await expect(bot.press(`agenda_ok:${ID}:year:0`, ctx)).rejects.toThrow()
    })

    it('un error de BD en un botón avisa sin lanzar', async () => {
      h.updateOne.mockRejectedValue(new Error('db'))

      await bot.press(`agenda_ok:${ID}:today:0`, ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
        { show_alert: true }
      )
    })
  })

  it('showAgenda se puede invocar desde el menú principal', async () => {
    await showAgenda(ctx)

    expect(ctx.reply).toHaveBeenCalled()
  })
})
