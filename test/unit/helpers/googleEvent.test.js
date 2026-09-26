import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { toGoogleEvent } from '@/helpers/calendar/googleEvent.js'

const appointment = (extra = {}) => ({
  _id: '0123456789abcdef01234567',
  client: 'Ana Pérez',
  location: 'Oficina',
  notes: 'Traer contrato',
  startAt: new Date('2099-06-01T08:00:00Z'),
  endAt: new Date('2099-06-01T09:30:00Z'),
  status: 'pending',
  ...extra
})

describe('toGoogleEvent', () => {
  it('usa el _id de la cita como id del evento (hexadecimal, válido para Google)', () => {
    const { id } = toGoogleEvent(appointment(), 'Europe/Madrid')

    expect(id).toBe('0123456789abcdef01234567')
    // Google: 5–1024 caracteres entre a-v y 0-9
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/)
  })

  it('un ObjectId real (no una cadena) también funciona', () => {
    const _id = new Types.ObjectId()

    expect(toGoogleEvent(appointment({ _id }), 'Europe/Madrid').id).toBe(
      String(_id)
    )
  })

  it('mapea los datos de la cita, con horas ISO y la zona del usuario', () => {
    expect(toGoogleEvent(appointment(), 'America/Bogota')).toEqual({
      id: '0123456789abcdef01234567',
      summary: 'Ana Pérez',
      location: 'Oficina',
      description: 'Traer contrato',
      status: 'tentative',
      start: {
        dateTime: '2099-06-01T08:00:00.000Z',
        timeZone: 'America/Bogota'
      },
      end: { dateTime: '2099-06-01T09:30:00.000Z', timeZone: 'America/Bogota' },
      reminders: { useDefault: false }
    })
  })

  it.each([
    ['pending', 'tentative'],
    ['confirmed', 'confirmed']
  ])('estado %s → %s', (status, expected) => {
    expect(toGoogleEvent(appointment({ status }), 'Europe/Madrid').status).toBe(
      expected
    )
  })

  it('sin ubicación ni notas no las envía (así una edición las borra en Google)', () => {
    const event = toGoogleEvent(
      appointment({ location: undefined, notes: undefined }),
      'Europe/Madrid'
    )

    expect(JSON.parse(JSON.stringify(event))).not.toHaveProperty('location')
    expect(JSON.parse(JSON.stringify(event))).not.toHaveProperty('description')
  })

  it('las fechas serializadas en sesión (cadenas) también se aceptan', () => {
    const event = toGoogleEvent(
      appointment({ startAt: '2099-06-01T08:00:00.000Z' }),
      'Europe/Madrid'
    )

    expect(event.start.dateTime).toBe('2099-06-01T08:00:00.000Z')
  })
})
