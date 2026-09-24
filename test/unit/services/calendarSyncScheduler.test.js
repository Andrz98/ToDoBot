import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  tick: null,
  linksFind: vi.fn(),
  aptFind: vi.fn(),
  updateOne: vi.fn(),
  upsertEvent: vi.fn(),
  deleteEvent: vi.fn(),
  tz: vi.fn(),
  sleep: vi.fn()
}))

vi.mock('node-cron', () => ({
  default: {
    schedule: (_expr, cb) => {
      h.tick = cb
    }
  }
}))
vi.mock('@/models/calendarLink.js', () => ({
  CalendarLink: { find: h.linksFind }
}))
vi.mock('@/models/appointment.js', () => ({
  Appointment: { find: h.aptFind, updateOne: h.updateOne }
}))
vi.mock('@/services/google/calendarClient.js', () => ({
  upsertEvent: h.upsertEvent,
  deleteEvent: h.deleteEvent
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)
vi.mock('@/utils/delayUtils/sleep.js', () => ({ sleep: h.sleep }))

import {
  startCalendarSyncScheduler,
  syncPendingAppointments
} from '@/services/schedulers/calendarSyncScheduler.js'

const lean = (value) => ({ lean: () => Promise.resolve(value) })
// Appointment.find(...).sort(...).limit(...).lean()
const chain = (value) => {
  const query = {
    sort: vi.fn(() => query),
    limit: vi.fn(() => query),
    lean: () => Promise.resolve(value)
  }
  return query
}

const UPDATED = new Date('2099-01-01T00:00:00Z')
const appointment = (n, extra = {}) => ({
  _id: `id${n}`,
  userId: 7,
  client: `Cliente ${n}`,
  status: 'pending',
  startAt: new Date('2099-06-01T08:00:00Z'),
  endAt: new Date('2099-06-01T09:00:00Z'),
  updatedAt: UPDATED,
  ...extra
})

describe('calendarSyncScheduler', () => {
  let query
  beforeEach(() => {
    Object.values(h)
      .filter((value) => typeof value?.mockReset === 'function')
      .forEach((fn) => fn.mockReset())
    h.linksFind.mockReturnValue(
      lean([
        { userId: 7, calendarId: 'cal-7' },
        { userId: 8, calendarId: 'cal-8' }
      ])
    )
    query = chain([appointment(1)])
    h.aptFind.mockReturnValue(query)
    h.updateOne.mockResolvedValue({})
    h.upsertEvent.mockResolvedValue(undefined)
    h.deleteEvent.mockResolvedValue(undefined)
    h.tz.mockResolvedValue('Europe/Madrid')
    h.sleep.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('syncPendingAppointments', () => {
    it('sin ningún calendario conectado no consulta las citas', async () => {
      h.linksFind.mockReturnValue(lean([]))

      await syncPendingAppointments()

      expect(h.aptFind).not.toHaveBeenCalled()
    })

    it('solo pide las pendientes de usuarios conectados, las más antiguas primero y por lotes', async () => {
      await syncPendingAppointments()

      expect(h.aptFind).toHaveBeenCalledWith({
        gcalDirty: true,
        userId: { $in: [7, 8] }
      })
      expect(query.sort).toHaveBeenCalledWith({ gcalTriedAt: 1, updatedAt: 1 })
      expect(query.limit).toHaveBeenCalledWith(20)
    })

    it('envía la cita al calendario de SU usuario, con la zona horaria de ese usuario', async () => {
      h.aptFind.mockReturnValue(chain([appointment(1, { userId: 8 })]))
      h.tz.mockResolvedValue('America/Bogota')

      await syncPendingAppointments()

      expect(h.tz).toHaveBeenCalledWith(8)
      expect(h.upsertEvent).toHaveBeenCalledWith(
        'cal-8',
        expect.objectContaining({
          id: 'id1',
          summary: 'Cliente 1',
          status: 'tentative',
          start: expect.objectContaining({ timeZone: 'America/Bogota' })
        })
      )
      expect(h.deleteEvent).not.toHaveBeenCalled()
    })

    it('una cita cancelada borra su evento y no lo actualiza (un PUT lo resucitaría)', async () => {
      h.aptFind.mockReturnValue(
        chain([appointment(1, { status: 'cancelled' })])
      )

      await syncPendingAppointments()

      expect(h.deleteEvent).toHaveBeenCalledWith('cal-7', 'id1')
      expect(h.upsertEvent).not.toHaveBeenCalled()
      expect(h.updateOne).toHaveBeenCalledWith(
        { _id: 'id1', updatedAt: UPDATED },
        { gcalDirty: false, gcalTriedAt: null },
        { timestamps: false }
      )
    })

    it('la marca como sincronizada solo si nadie la tocó mientras tanto', async () => {
      await syncPendingAppointments()

      // Si se editó durante el envío, updatedAt ya no coincide y sigue pendiente
      expect(h.updateOne).toHaveBeenCalledWith(
        { _id: 'id1', updatedAt: UPDATED },
        { gcalDirty: false, gcalTriedAt: null },
        { timestamps: false }
      )
    })

    it('espacia las escrituras para no chocar con los límites de Google', async () => {
      h.aptFind.mockReturnValue(
        chain([appointment(1), appointment(2), appointment(3)])
      )

      await syncPendingAppointments()

      expect(h.upsertEvent).toHaveBeenCalledTimes(3)
      expect(h.sleep).toHaveBeenCalledTimes(3)
      expect(h.sleep).toHaveBeenCalledWith(300)
    })

    it('una cita que falla queda pendiente, se anota el intento y las demás siguen', async () => {
      h.aptFind.mockReturnValue(chain([appointment(1), appointment(2)]))
      h.upsertEvent.mockRejectedValueOnce(new Error('Google caído'))

      await syncPendingAppointments()

      expect(h.upsertEvent).toHaveBeenCalledTimes(2)
      // La 1ª: solo se anota el intento (no se limpia dirty)
      expect(h.updateOne).toHaveBeenCalledWith(
        { _id: 'id1' },
        { gcalTriedAt: expect.any(Date) },
        { timestamps: false }
      )
      expect(h.updateOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'id1', updatedAt: UPDATED }),
        expect.anything(),
        expect.anything()
      )
      // La 2ª sí se sincroniza
      expect(h.updateOne).toHaveBeenCalledWith(
        { _id: 'id2', updatedAt: UPDATED },
        { gcalDirty: false, gcalTriedAt: null },
        { timestamps: false }
      )
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('id1'),
        'Google caído'
      )
    })

    it('un usuario sin zona horaria válida (huérfano) no frena a los demás', async () => {
      h.aptFind.mockReturnValue(chain([appointment(1), appointment(2)]))
      h.tz.mockRejectedValueOnce(new Error('User 7 not found'))

      await syncPendingAppointments()

      expect(h.upsertEvent).toHaveBeenCalledTimes(1)
      expect(h.upsertEvent).toHaveBeenCalledWith(
        'cal-7',
        expect.objectContaining({ id: 'id2' })
      )
    })

    it('tras 3 fallos seguidos corta el barrido en vez de insistir con Google caído', async () => {
      h.aptFind.mockReturnValue(
        chain([1, 2, 3, 4, 5].map((n) => appointment(n)))
      )
      h.upsertEvent.mockRejectedValue(new Error('Google caído'))

      await syncPendingAppointments()

      expect(h.upsertEvent).toHaveBeenCalledTimes(3)
    })

    it('un éxito entre fallos reinicia la cuenta de fallos seguidos', async () => {
      h.aptFind.mockReturnValue(
        chain([1, 2, 3, 4, 5].map((n) => appointment(n)))
      )
      h.upsertEvent
        .mockRejectedValueOnce(new Error('x'))
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('x'))
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValue(undefined)

      await syncPendingAppointments()

      expect(h.upsertEvent).toHaveBeenCalledTimes(5)
    })

    it('si anotar el intento fallido también falla, no lanza', async () => {
      h.upsertEvent.mockRejectedValue(new Error('Google caído'))
      h.updateOne.mockRejectedValue(new Error('db'))

      await expect(syncPendingAppointments()).resolves.toBeUndefined()
    })
  })

  describe('startCalendarSyncScheduler', () => {
    it('barre cada minuto y un error de BD no lo tumba', async () => {
      h.linksFind.mockImplementation(() => {
        throw new Error('db')
      })
      startCalendarSyncScheduler()

      await expect(h.tick()).resolves.toBeUndefined()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('sincronizar con Google'),
        'db'
      )
    })

    it('si un barrido sigue en marcha, el siguiente se salta', async () => {
      let release
      h.linksFind.mockReturnValue({
        lean: () => new Promise((resolve) => (release = () => resolve([])))
      })
      startCalendarSyncScheduler()

      const first = h.tick()
      await h.tick() // el segundo retorna sin hacer nada
      expect(h.linksFind).toHaveBeenCalledTimes(1)

      release()
      await first
      h.linksFind.mockReturnValue(lean([]))
      await h.tick() // ya terminó: el siguiente vuelve a trabajar
      expect(h.linksFind).toHaveBeenCalledTimes(2)
    })
  })
})
