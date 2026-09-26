import { DateTime } from 'luxon'
import { Markup } from 'telegraf'
import { FINISH_ACTION_LABEL } from '../../replyMessages/genericReplyMessages.js'

/**
 * Selector de fecha y hora con inline keyboard, sin estado: cada botón lleva en su
 * callback_data todo lo elegido hasta ese momento. Así un callback atrasado no
 * depende de la sesión y siempre se puede revalidar.
 *
 * callback_data (prefijo = flujo, p. ej. 'add' | 'edit'):
 *   {p}_cal[:YYYY-MM]        calendario del mes (sin mes = mes actual)
 *   {p}_day:YYYY-MM-DD       día elegido → horas
 *   {p}_hour:YYYY-MM-DDTHH   hora elegida → minutos
 *   {p}_min:YYYY-MM-DDTHH:mm fecha y hora completas
 *   {p}_noop                 celda informativa o deshabilitada
 */

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MINUTES = [0, 15, 30, 45]
const HOURS_PER_ROW = 4
const DISABLED = '·'

const pad = (n) => String(n).padStart(2, '0')
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const button = (text, data) => Markup.button.callback(text, data)
const noop = (prefix, text = ' ') => button(text, `${prefix}_noop`)

const monthTitle = (dt) => capitalize(dt.setLocale('es').toFormat('LLLL yyyy'))
const dayTitle = (dt) =>
  capitalize(dt.setLocale('es').toFormat("cccc d 'de' LLLL 'de' yyyy"))

const cancelButton = (prefix) => button(FINISH_ACTION_LABEL, `${prefix}_cancel`)

/** Primer día del mes pedido; si no es válido o ya pasó entero, el mes actual. */
export function resolveMonth(yearMonth, timezone, now = DateTime.now()) {
  const current = now.setZone(timezone).startOf('month')
  if (!yearMonth) {
    return current
  }
  const month = DateTime.fromFormat(yearMonth, 'yyyy-MM', { zone: timezone })
  return month.isValid && month >= current ? month : current
}

/** Día del selector (YYYY-MM-DD) en la zona del usuario, o null si es inválido o pasado. */
export function resolveDay(isoDate, timezone, now = DateTime.now()) {
  const day = DateTime.fromFormat(isoDate, 'yyyy-MM-dd', { zone: timezone })
  const today = now.setZone(timezone).startOf('day')
  return day.isValid && day >= today ? day : null
}

/** Fecha y hora finales como Date, o null si son inválidas o ya pasaron. */
export function resolveDateTime(isoDate, hour, minute, timezone, now = DateTime.now()) {
  const day = resolveDay(isoDate, timezone, now)
  if (!day || hour > 23 || minute > 59) {
    return null
  }
  const dt = day.set({ hour, minute })
  return dt > now ? dt.toJSDate() : null
}

export function buildCalendar(prefix, month, timezone, now = DateTime.now()) {
  const today = now.setZone(timezone).startOf('day')
  const title = monthTitle(month)
  const rows = [WEEKDAYS.map((d) => noop(prefix, d))]

  let week = Array.from({ length: month.weekday - 1 }, () => noop(prefix))
  for (let day = 1; day <= month.daysInMonth; day++) {
    const date = month.set({ day })
    week.push(
      date < today
        ? noop(prefix, DISABLED)
        : button(String(day), `${prefix}_day:${date.toISODate()}`)
    )
    if (week.length === 7) {
      rows.push(week)
      week = []
    }
  }
  if (week.length) {
    rows.push([
      ...week,
      ...Array.from({ length: 7 - week.length }, () => noop(prefix))
    ])
  }

  const prev = month.minus({ months: 1 })
  const next = month.plus({ months: 1 })
  const hasPastMonths = month > today.startOf('month')
  rows.push([
    hasPastMonths
      ? button('⬅️', `${prefix}_cal:${prev.toFormat('yyyy-MM')}`)
      : noop(prefix),
    noop(prefix, title),
    button('➡️', `${prefix}_cal:${next.toFormat('yyyy-MM')}`)
  ])
  rows.push([button('⌨️ Escribir fecha y hora', `${prefix}_datetext`)])
  rows.push([button('↩️ Volver', `${prefix}_back`), cancelButton(prefix)])

  return {
    text: `📅 ${title}\nElige el día:`,
    reply_markup: { inline_keyboard: rows }
  }
}

export function buildHourPicker(prefix, day, now = DateTime.now()) {
  const isoDate = day.toISODate()
  const rows = []
  for (let first = 0; first < 24; first += HOURS_PER_ROW) {
    const row = []
    for (let hour = first; hour < first + HOURS_PER_ROW; hour++) {
      const lastSlot = day.set({ hour, minute: MINUTES.at(-1) })
      row.push(
        lastSlot <= now
          ? noop(prefix, DISABLED)
          : button(`${pad(hour)}h`, `${prefix}_hour:${isoDate}T${pad(hour)}`)
      )
    }
    rows.push(row)
  }
  rows.push([
    button('↩️ Cambiar día', `${prefix}_cal:${day.toFormat('yyyy-MM')}`),
    cancelButton(prefix)
  ])

  return {
    text: `🕐 ${dayTitle(day)}\nElige la hora:`,
    reply_markup: { inline_keyboard: rows }
  }
}

export function buildMinutePicker(prefix, day, hour, now = DateTime.now()) {
  const isoDate = day.toISODate()
  const row = MINUTES.map((minute) => {
    const label = `${pad(hour)}:${pad(minute)}`
    return day.set({ hour, minute }) <= now
      ? noop(prefix, DISABLED)
      : button(label, `${prefix}_min:${isoDate}T${label}`)
  })

  return {
    text: `🕐 ${dayTitle(day)}, ${pad(hour)}:__\nElige los minutos:`,
    reply_markup: {
      inline_keyboard: [
        row,
        [
          button('↩️ Cambiar hora', `${prefix}_day:${isoDate}`),
          cancelButton(prefix)
        ]
      ]
    }
  }
}
