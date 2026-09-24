import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  tick: null,
  find: vi.fn(),
  send: vi.fn(),
  tz: vi.fn(),
  del: vi.fn(),
  schedule: vi.fn(),
  findApt: vi.fn()
}))

vi.mock('node-cron', () => ({
  default: {
    schedule: (_expr, cb) => {
      h.tick = cb
    }
  }
}))
vi.mock('@/models/task.js', () => ({ Task: { find: h.find } }))
vi.mock('@/models/appointment.js', () => ({
  Appointment: { find: h.findApt }
}))
vi.mock('@/config/telegraf/telegraf.js', () => ({ bot: {} }))
vi.mock('@/utils/retryUtils/safeSendMessage.js', () => ({
  safeSendMessage: h.send
}))
vi.mock('@/utils/telegramUtils/messageLifecycle.js', () => ({
  deleteNow: h.del,
  scheduleDeletion: h.schedule
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { startReminderScheduler } from '@/services/schedulers/reminderScheduler.js'

const NOW = new Date('2099-01-01T00:00:00Z').getTime()
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const makeTask = (userId, name, extra = {}) => ({
  _id: `id-${userId}`,
  userId,
  name,
  reminderAt: new Date(NOW + DAY),
  alertsSent: [],
  save: vi.fn().mockResolvedValue(undefined),
  ...extra
})

const runTick = async (tasks) => {
  h.find.mockResolvedValue(tasks)
  startReminderScheduler()
  await h.tick()
}

describe('reminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    h.find.mockReset()
    h.findApt.mockReset().mockResolvedValue([])
    h.send.mockReset().mockResolvedValue(undefined)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    h.del.mockReset().mockResolvedValue(undefined)
    h.schedule.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('avisa a las tareas que vencen en la ventana y marca la alerta', async () => {
    const task = makeTask(1, 'Pagar luz')

    await runTick([task])

    expect(h.send).toHaveBeenCalledTimes(1)
    expect(task.alertsSent).toEqual(['24h'])
    expect(task.save).toHaveBeenCalled()
  })

  it('un fallo al enviar a un usuario (403 bot bloqueado) no impide avisar al resto', async () => {
    const blocked = makeTask(1, 'A')
    const ok = makeTask(2, 'B')
    h.send.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: bot was blocked by the user'), {
        response: { error_code: 403 }
      })
    )

    await runTick([blocked, ok])

    expect(h.send).toHaveBeenCalledTimes(2)
    expect(ok.alertsSent).toEqual(['24h'])
    expect(blocked.alertsSent).toEqual([]) // no se marca: se reintenta en la siguiente pasada
  })

  it('un usuario huérfano (getUserTimezone lanza) no impide avisar al resto', async () => {
    const orphan = makeTask(1, 'A')
    const ok = makeTask(2, 'B')
    h.tz.mockRejectedValueOnce(new Error('User 1 not found'))

    await runTick([orphan, ok])

    expect(h.send).toHaveBeenCalledTimes(1)
    expect(ok.alertsSent).toEqual(['24h'])
  })

  it('una tarea sin reminderAt se ignora sin romper el bucle', async () => {
    const noDate = makeTask(1, 'A', { reminderAt: undefined })
    const ok = makeTask(2, 'B')

    await runTick([noDate, ok])

    expect(h.send).toHaveBeenCalledTimes(1)
    expect(ok.alertsSent).toEqual(['24h'])
  })

  it('con DEBUG=true no registra el nombre de la tarea ni el usuario', async () => {
    vi.stubEnv('DEBUG', 'true')
    const captured = []
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      captured.push(JSON.stringify(args))
    })

    await runTick([makeTask(424242, 'NOMBRE-PRIVADO', { _id: 'abc123' })])

    expect(log).toHaveBeenCalled()
    expect(captured.join(' | ')).not.toContain('NOMBRE-PRIVADO')
    expect(captured.join(' | ')).not.toContain('424242')
    vi.unstubAllEnvs()
  })

  it('avisa a 1h', async () => {
    const task = makeTask(1, 'A', { reminderAt: new Date(NOW + HOUR) })

    await runTick([task])

    expect(task.alertsSent).toEqual(['1h'])
  })

  it.each([72, 48, 7, 3])('ya no avisa a %ih', async (hours) => {
    const task = makeTask(1, 'A', { reminderAt: new Date(NOW + hours * HOUR) })

    await runTick([task])

    expect(h.send).not.toHaveBeenCalled()
  })

  it('envía el aviso con botones y guarda su id; caduca 1h después de la tarea', async () => {
    const task = makeTask(1, 'Pagar luz')
    h.send.mockResolvedValue({ message_id: 55 })

    await runTick([task])

    const { reply_markup } = h.send.mock.calls[0][3]
    expect(
      reply_markup.inline_keyboard.flat().map((b) => b.callback_data)
    ).toEqual([
      'rem_done::id-1',
      'rem_snooze::id-1::1h',
      'rem_snooze::id-1::1d'
    ])
    expect(task.reminderMessageId).toBe(55)
    expect(h.schedule).toHaveBeenCalledWith(
      expect.anything(),
      55,
      DAY + HOUR,
      1
    )
  })

  it('cada aviso sustituye al anterior de la tarea', async () => {
    const task = makeTask(1, 'A', { reminderMessageId: 11 })
    h.send.mockResolvedValue({ message_id: 55 })

    await runTick([task])

    expect(h.del).toHaveBeenCalledWith(expect.anything(), 11, 1)
    expect(task.reminderMessageId).toBe(55)
  })

  it('si el envío falla, el aviso anterior se conserva', async () => {
    const task = makeTask(1, 'A', { reminderMessageId: 11 })
    h.send.mockRejectedValueOnce(new Error('boom'))

    await runTick([task])

    expect(h.del).not.toHaveBeenCalled()
    expect(task.reminderMessageId).toBe(11)
  })

  describe('citas', () => {
    const makeAppointment = (userId, client, extra = {}) => ({
      _id: `apt-${userId}`,
      userId,
      client,
      startAt: new Date(NOW + DAY),
      status: 'pending',
      alertsSent: [],
      save: vi.fn().mockResolvedValue(undefined),
      ...extra
    })
    const runAppointments = async (appointments, tasks = []) => {
      h.find.mockResolvedValue(tasks)
      h.findApt.mockResolvedValue(appointments)
      startReminderScheduler()
      await h.tick()
    }

    it('avisa de una cita sin confirmar con el botón Confirmar y su estado', async () => {
      const appointment = makeAppointment(1, 'Ana', { location: 'Oficina' })
      h.send.mockResolvedValue({ message_id: 55 })

      await runAppointments([appointment])

      const [, userId, text, opts] = h.send.mock.calls[0]
      expect(userId).toBe(1)
      expect(text).toContain('Cita (24h antes)')
      expect(text).toContain('Ana')
      expect(text).toContain('📍 Oficina')
      expect(text).toContain('Sin confirmar')
      expect(
        opts.reply_markup.inline_keyboard.flat().map((b) => b.callback_data)
      ).toEqual(['rem_aptok::apt-1'])
      expect(appointment.alertsSent).toEqual(['24h'])
      expect(appointment.reminderMessageId).toBe(55)
      expect(h.schedule).toHaveBeenCalledWith(
        expect.anything(),
        55,
        DAY + HOUR,
        1
      )
    })

    it('una cita confirmada se avisa sin botones ni marca de pendiente', async () => {
      await runAppointments([
        makeAppointment(1, 'Ana', { status: 'confirmed' })
      ])

      const [, , text, opts] = h.send.mock.calls[0]
      expect(opts.reply_markup).toBeUndefined()
      expect(text).not.toContain('Sin confirmar')
    })

    it('solo pide las no canceladas que caen en la ventana de la alerta más lejana', async () => {
      await runAppointments([])

      expect(h.findApt).toHaveBeenCalledWith({
        status: { $ne: 'cancelled' },
        startAt: {
          $gte: new Date(NOW),
          $lte: new Date(NOW + DAY + 60 * 1000)
        }
      })
    })

    it('escapa el HTML del cliente y de la ubicación', async () => {
      await runAppointments([
        makeAppointment(1, 'a <b> & c', { location: '<i>x</i>' })
      ])

      const text = h.send.mock.calls[0][2]
      expect(text).toContain('<b>a &lt;b&gt; &amp; c</b>')
      expect(text).toContain('&lt;i&gt;x&lt;/i&gt;')
    })

    it('un fallo al avisar de una cita no impide avisar de las demás', async () => {
      const failing = makeAppointment(1, 'A')
      const ok = makeAppointment(2, 'B')
      h.send.mockRejectedValueOnce(new Error('boom'))

      await runAppointments([failing, ok])

      expect(h.send).toHaveBeenCalledTimes(2)
      expect(failing.alertsSent).toEqual([]) // se reintenta en la siguiente pasada
      expect(ok.alertsSent).toEqual(['24h'])
    })

    it('las tareas y las citas se avisan en la misma pasada', async () => {
      const task = makeTask(1, 'Pagar luz')
      const appointment = makeAppointment(2, 'Ana')

      await runAppointments([appointment], [task])

      expect(task.alertsSent).toEqual(['24h'])
      expect(appointment.alertsSent).toEqual(['24h'])
    })

    it('si fallan las tareas (BD), las citas se avisan igualmente', async () => {
      h.find.mockRejectedValue(new Error('db'))
      h.findApt.mockResolvedValue([makeAppointment(1, 'A')])
      startReminderScheduler()

      await h.tick()

      expect(h.send).toHaveBeenCalledTimes(1)
    })
  })

  it('escapa el HTML del nombre de la tarea en el recordatorio', async () => {
    const task = makeTask(1, 'a <b> & c')

    await runTick([task])

    const text = h.send.mock.calls[0][2]
    expect(text).toContain('<b>a &lt;b&gt; &amp; c</b>')
  })
})
