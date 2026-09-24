import { describe, it, expect } from 'vitest'
import { Appointment, APPOINTMENT_TTL_SECONDS } from '@/models/appointment.js'

const base = {
  userId: 7,
  client: 'Ana',
  startAt: new Date('2099-06-01T08:00:00Z'),
  endAt: new Date('2099-06-01T09:00:00Z')
}

describe('modelo Appointment', () => {
  it('nace sin confirmar y sin alertas enviadas', () => {
    const appointment = new Appointment(base)
    expect(appointment.status).toBe('pending')
    expect(appointment.alertsSent).toEqual([])
    expect(appointment.validateSync()).toBeUndefined()
  })

  it('exige cliente, inicio y fin', () => {
    const errors = new Appointment({ userId: 7 }).validateSync().errors
    expect(Object.keys(errors).sort()).toEqual(['client', 'endAt', 'startAt'])
  })

  it('el fin debe ser posterior al inicio', () => {
    const same = new Appointment({ ...base, endAt: base.startAt })
    const before = new Appointment({
      ...base,
      endAt: new Date('2099-06-01T07:00:00Z')
    })
    expect(same.validateSync().errors.endAt).toBeDefined()
    expect(before.validateSync().errors.endAt).toBeDefined()
  })

  it('rechaza estados desconocidos y textos demasiado largos', () => {
    const errors = new Appointment({
      ...base,
      status: 'archived',
      client: 'x'.repeat(101),
      location: 'x'.repeat(201),
      notes: 'x'.repeat(501)
    }).validateSync().errors
    expect(Object.keys(errors).sort()).toEqual([
      'client',
      'location',
      'notes',
      'status'
    ])
  })

  it('nace pendiente de sincronizar con Google y sin intentos fallidos', () => {
    const appointment = new Appointment(base)
    expect(appointment.gcalDirty).toBe(true)
    expect(appointment.gcalTriedAt).toBeUndefined()
  })

  it('el barrido de Google solo indexa las citas pendientes', () => {
    const [keys, options] = Appointment.schema
      .indexes()
      .find(([, opts]) => opts.partialFilterExpression)

    expect(keys).toEqual({ gcalDirty: 1, userId: 1 })
    expect(options.partialFilterExpression).toEqual({ gcalDirty: true })
  })

  it('se purga sola 90 días después de terminar; la agenda está indexada por usuario y hora', () => {
    const indexes = Appointment.schema.indexes()
    const ttl = indexes.find(([, options]) => options.expireAfterSeconds)
    expect(ttl[0]).toEqual({ endAt: 1 })
    expect(ttl[1].expireAfterSeconds).toBe(APPOINTMENT_TTL_SECONDS)
    expect(APPOINTMENT_TTL_SECONDS).toBe(90 * 24 * 60 * 60)
    expect(
      indexes.some(([keys]) => keys.userId === 1 && keys.startAt === 1)
    ).toBe(true)
  })
})
