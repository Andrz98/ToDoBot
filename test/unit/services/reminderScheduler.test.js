import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  tick: null,
  find: vi.fn(),
  send: vi.fn(),
  tz: vi.fn()
}))

vi.mock('node-cron', () => ({
  default: {
    schedule: (_expr, cb) => {
      h.tick = cb
    }
  }
}))
vi.mock('@/models/task.js', () => ({ Task: { find: h.find } }))
vi.mock('@/config/telegraf/telegraf.js', () => ({ bot: {} }))
vi.mock('@/utils/retryUtils/safeSendMessage.js', () => ({
  safeSendMessage: h.send
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { startReminderScheduler } from '@/services/schedulers/reminderScheduler.js'

const NOW = new Date('2099-01-01T00:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000

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
    h.send.mockReset().mockResolvedValue(undefined)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
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

  it('escapa el HTML del nombre de la tarea en el recordatorio', async () => {
    const task = makeTask(1, 'a <b> & c')

    await runTick([task])

    const text = h.send.mock.calls[0][2]
    expect(text).toContain('<b>a &lt;b&gt; &amp; c</b>')
  })
})
