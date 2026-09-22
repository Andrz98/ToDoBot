import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
import {
  resolveMonth,
  resolveDay,
  resolveDateTime,
  buildCalendar,
  buildHourPicker,
  buildMinutePicker
} from '@/helpers/taskHelpers/date/datePicker.js'

const TZ = 'Europe/Madrid'
// 15/10/2026 12:20 en Madrid
const NOW = DateTime.fromISO('2026-10-15T12:20', { zone: TZ })

const keyboard = (built) => built.reply_markup.inline_keyboard
const days = (built) =>
  keyboard(built)
    .slice(1, -3)
    .flat()
    .filter((b) => b.callback_data.includes('_day:'))
    .map((b) => b.callback_data.split(':')[1])
const navRow = (built) => keyboard(built).at(-3)

describe('calendario', () => {
  it('empieza la semana en lunes y coloca el día 1 en su columna', () => {
    // 1/10/2026 es jueves
    const cal = buildCalendar('add', resolveMonth('2026-10', TZ, NOW), TZ, NOW)

    expect(keyboard(cal)[0].map((b) => b.text)).toEqual([
      'Lu',
      'Ma',
      'Mi',
      'Ju',
      'Vi',
      'Sá',
      'Do'
    ])
    expect(keyboard(cal)[1].map((b) => b.text)).toEqual([
      ' ',
      ' ',
      ' ',
      '·',
      '·',
      '·',
      '·'
    ])
    expect(
      keyboard(cal)
        .slice(1, -3)
        .every((row) => row.length === 7)
    ).toBe(true)
  })

  it('deshabilita los días pasados y ofrece desde hoy', () => {
    const cal = buildCalendar('add', resolveMonth('2026-10', TZ, NOW), TZ, NOW)

    expect(days(cal)[0]).toBe('2026-10-15')
    expect(days(cal).at(-1)).toBe('2026-10-31')
  })

  it('en el mes actual no permite retroceder; en uno futuro sí', () => {
    const current = buildCalendar(
      'add',
      resolveMonth(undefined, TZ, NOW),
      TZ,
      NOW
    )
    const next = buildCalendar('add', resolveMonth('2026-11', TZ, NOW), TZ, NOW)

    expect(navRow(current)[0].callback_data).toBe('add_noop')
    expect(navRow(next)[0].callback_data).toBe('add_cal:2026-10')
  })

  it('diciembre → enero y enero → diciembre cambian de año', () => {
    const dec = buildCalendar('add', resolveMonth('2026-12', TZ, NOW), TZ, NOW)
    const jan = buildCalendar('add', resolveMonth('2027-01', TZ, NOW), TZ, NOW)

    expect(navRow(dec)[2].callback_data).toBe('add_cal:2027-01')
    expect(navRow(jan)[0].callback_data).toBe('add_cal:2026-12')
    expect(jan.text).toContain('Enero 2027')
  })

  it('febrero bisiesto tiene 29 días y el no bisiesto 28', () => {
    const leap = buildCalendar('add', resolveMonth('2028-02', TZ, NOW), TZ, NOW)
    const common = buildCalendar(
      'add',
      resolveMonth('2027-02', TZ, NOW),
      TZ,
      NOW
    )

    expect(days(leap).at(-1)).toBe('2028-02-29')
    expect(days(common).at(-1)).toBe('2027-02-28')
  })

  it('un mes ya pasado o mal formado cae en el mes actual', () => {
    expect(resolveMonth('2020-01', TZ, NOW).toISODate()).toBe('2026-10-01')
    expect(resolveMonth('2026-13', TZ, NOW).toISODate()).toBe('2026-10-01')
  })

  it('callback_data dentro del límite de 64 bytes de Telegram', () => {
    const cal = buildCalendar('edit', resolveMonth('2026-12', TZ, NOW), TZ, NOW)
    const all = keyboard(cal)
      .flat()
      .map((b) => b.callback_data)

    expect(
      Math.max(...all.map((d) => Buffer.byteLength(d)))
    ).toBeLessThanOrEqual(64)
  })
})

describe('selector de hora y minutos', () => {
  it('hoy deshabilita las horas ya pasadas; la hora en curso sigue si le quedan minutos', () => {
    const picker = buildHourPicker(
      'add',
      resolveDay('2026-10-15', TZ, NOW),
      NOW
    )
    const hours = keyboard(picker).slice(0, -1).flat()

    expect(hours[11].text).toBe('·')
    expect(hours[12].callback_data).toBe('add_hour:2026-10-15T12')
    expect(hours[23].callback_data).toBe('add_hour:2026-10-15T23')
  })

  it('un día futuro ofrece las 24 horas', () => {
    const picker = buildHourPicker(
      'add',
      resolveDay('2026-10-16', TZ, NOW),
      NOW
    )

    expect(
      keyboard(picker)
        .slice(0, -1)
        .flat()
        .every((b) => b.text !== '·')
    ).toBe(true)
  })

  it('minutos en pasos de 15, sin los ya pasados', () => {
    const picker = buildMinutePicker(
      'add',
      resolveDay('2026-10-15', TZ, NOW),
      12,
      NOW
    )

    expect(keyboard(picker)[0].map((b) => b.text)).toEqual([
      '·',
      '·',
      '12:30',
      '12:45'
    ])
    expect(keyboard(picker)[0][2].callback_data).toBe(
      'add_min:2026-10-15T12:30'
    )
  })
})

describe('resolución de la fecha final', () => {
  it('interpreta la hora elegida en la zona del usuario', () => {
    const date = resolveDateTime('2026-12-25', 10, 0, 'America/Bogota', NOW)

    expect(date.toISOString()).toBe('2026-12-25T15:00:00.000Z')
  })

  it('rechaza fechas pasadas, días inexistentes y horas fuera de rango', () => {
    expect(resolveDateTime('2026-10-15', 12, 0, TZ, NOW)).toBeNull()
    expect(resolveDateTime('2026-02-30', 10, 0, TZ, NOW)).toBeNull()
    expect(resolveDateTime('2026-10-20', 24, 0, TZ, NOW)).toBeNull()
    expect(resolveDay('2026-10-14', TZ, NOW)).toBeNull()
  })
})
