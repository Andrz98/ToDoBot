import { DateTime } from 'luxon'
import { Markup } from 'telegraf'
import { formatDateEs } from '../taskHelpers/date/formatDateEs.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { STATUS, STATUS_ICON, STATUS_LABEL } from './status.js'

export const DEFAULT_DURATION = 60
export const MIN_DURATION = 5
export const MAX_DURATION = 24 * 60
export const QUICK_DURATIONS = [30, 45, 60, 90, 120]
export const AGENDA_PAGE_SIZE = 8
export const RANGES = Object.freeze({
  today: 'Hoy',
  tomorrow: 'Mañana',
  week: 'Semana'
})

const DEFAULT_TZ = 'Europe/Madrid'

const button = (text, data) => Markup.button.callback(text, data)
const noop = (text) => button(text, 'agenda_noop')
const at = (date, timezone) =>
  DateTime.fromJSDate(new Date(date), { zone: timezone })
const hhmm = (date, timezone) => at(date, timezone).toFormat('HH:mm')

export const isValidDuration = (minutes) =>
  Number.isInteger(minutes) &&
  minutes >= MIN_DURATION &&
  minutes <= MAX_DURATION

export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const rest = minutes % 60
  return `${Math.floor(minutes / 60)} h${rest ? ` ${rest} min` : ''}`
}

/** "24 de septiembre de 2026, 10:00 GMT+2 – 11:00" */
export const formatRange = (start, end, timezone = DEFAULT_TZ) =>
  `${formatDateEs(new Date(start), timezone)} – ${hhmm(end, timezone)}`

// ─── Flujo /cita ────────────────────────────────────────────────────────────

/**
 * Interfaz única del flujo /cita (crear y editar): resume lo introducido y
 * permite completar o corregir cualquier campo. Avisa de solapes, sin bloquear.
 *
 * @param {object} pending – cita en construcción: { id?, client, startAt, durationMin, location, notes }
 * @param {string} timezone
 * @param {object|null} conflict – otra cita del usuario que se solapa
 */
export function buildAptMenu(
  pending = {},
  timezone = DEFAULT_TZ,
  conflict = null
) {
  const { id, client, location, notes } = pending
  const duration = pending.durationMin ?? DEFAULT_DURATION
  const start = pending.startAt
    ? formatDateEs(new Date(pending.startAt), timezone)
    : null

  const lines = [
    id ? '✏️ Editar cita' : '📆 Nueva cita',
    '',
    `👤 Cliente: ${client ?? '—'}`,
    `🕘 Inicio: ${start ?? '—'}`,
    `⏱️ Duración: ${formatDuration(duration)}`,
    `📍 Ubicación: ${location ?? '—'}`,
    `📝 Notas: ${notes ?? '—'}`,
    ''
  ]
  if (conflict) {
    lines.push(
      `⚠️ Se solapa con ${conflict.client} (${hhmm(conflict.startAt, timezone)}–${hhmm(conflict.endAt, timezone)}). Puedes guardarla igualmente.`,
      ''
    )
  }
  lines.push(
    client && start
      ? 'Revisa los datos y confirma, o corrige algún campo.'
      : 'Completa los campos obligatorios:'
  )

  const label = (filled, text) => `${filled ? '✏️' : '➕'} ${text}`
  const keyboard = [
    [button(label(client, 'Cliente (obligatorio)'), 'apt_field_client')],
    [button(label(start, 'Inicio (obligatorio)'), 'apt_cal')],
    [button(`⏱️ Duración: ${formatDuration(duration)}`, 'apt_dur')],
    [button(label(location, 'Ubicación (opcional)'), 'apt_field_loc')],
    [button(label(notes, 'Notas (opcional)'), 'apt_field_notes')]
  ]
  if (client && start) {
    keyboard.push([
      button(id ? '✅ Guardar cambios' : '✅ Confirmar cita', 'apt_confirm')
    ])
  }
  keyboard.push([button('✖️ Cancelar', 'apt_cancel')])

  return {
    text: lines.join('\n'),
    markup: { reply_markup: Markup.inlineKeyboard(keyboard).reply_markup }
  }
}

export function buildDurationMenu(current = DEFAULT_DURATION) {
  const options = QUICK_DURATIONS.map((minutes) =>
    button(
      `${minutes === current ? '✅ ' : ''}${formatDuration(minutes)}`,
      `apt_dur_${minutes}`
    )
  )
  return {
    text: '⏱️ ¿Cuánto dura la cita?',
    markup: {
      reply_markup: Markup.inlineKeyboard([
        options.slice(0, 3),
        options.slice(3),
        [button('⌨️ Otra duración', 'apt_dur_custom')],
        [button('↩️ Volver', 'apt_back')]
      ]).reply_markup
    }
  }
}

// ─── /agenda ────────────────────────────────────────────────────────────────

export const isRange = (value) => Object.hasOwn(RANGES, value)

/** Intervalo [from, to) del periodo, en la zona horaria del usuario. */
export function agendaRange(range, timezone, now = DateTime.now()) {
  const today = now.setZone(timezone).startOf('day')
  const from = range === 'tomorrow' ? today.plus({ days: 1 }) : today
  const days = range === 'week' ? 7 : 1
  return { from: from.toJSDate(), to: from.plus({ days }).toJSDate() }
}

/** Una página de la agenda. Todas las pantallas se pintan sobre el mismo mensaje. */
export function buildAgendaPage(
  appointments,
  range,
  requestedPage = 0,
  timezone = DEFAULT_TZ
) {
  const pages = Math.max(1, Math.ceil(appointments.length / AGENDA_PAGE_SIZE))
  const page = Math.min(Math.max(requestedPage, 0), pages - 1)
  const first = page * AGENDA_PAGE_SIZE

  const rows = [
    Object.entries(RANGES).map(([key, name]) =>
      button(key === range ? `• ${name}` : name, `agenda_r:${key}:0`)
    )
  ]
  for (const a of appointments.slice(first, first + AGENDA_PAGE_SIZE)) {
    const when = at(a.startAt, timezone).toFormat(
      range === 'week' ? 'dd/MM HH:mm' : 'HH:mm'
    )
    rows.push([
      button(
        `${STATUS_ICON[a.status]} ${when} · ${a.client}`,
        `agenda_d:${a._id}:${range}:${page}`
      )
    ])
  }
  if (pages > 1) {
    rows.push([
      page > 0 ? button('⬅️', `agenda_r:${range}:${page - 1}`) : noop(' '),
      noop(`${page + 1}/${pages}`),
      page < pages - 1
        ? button('➡️', `agenda_r:${range}:${page + 1}`)
        : noop(' ')
    ])
  }
  if (appointments.length === 0) {
    rows.push([button('➕ Nueva cita', 'menu_cita')])
  }

  const pageLine = pages > 1 ? ` · página ${page + 1}/${pages}` : ''
  const hint =
    appointments.length > 0
      ? 'Selecciona una cita para ver sus detalles:'
      : '📭 No tienes citas en este periodo.'
  return {
    text: `📆 Agenda · ${RANGES[range]} (${appointments.length})${pageLine}\n\n${hint}`,
    reply_markup: { inline_keyboard: rows }
  }
}

const target = (a, range, page) => `${a._id}:${range}:${page}`

/** Detalle de una cita, con sus acciones y vuelta a la página de la agenda. */
export function buildAgendaDetail(
  appointment,
  range,
  page = 0,
  timezone = DEFAULT_TZ
) {
  const a = appointment
  const lines = [
    `<b>${escapeHtml(a.client)}</b> · ${STATUS_LABEL[a.status]}`,
    '',
    `🕘 ${formatRange(a.startAt, a.endAt, timezone)}`
  ]
  if (a.location) {
    lines.push(`📍 ${escapeHtml(a.location)}`)
  }
  if (a.notes) {
    lines.push(`📝 ${escapeHtml(a.notes)}`)
  }
  const text = lines.join('\n')

  const rows = []
  if (a.status === STATUS.PENDING) {
    rows.push([button('✅ Confirmar', `agenda_ok:${target(a, range, page)}`)])
  }
  rows.push([
    button('✏️ Editar', `agenda_ed:${a._id}`),
    button('❌ Cancelar cita', `agenda_no:${target(a, range, page)}`)
  ])
  rows.push([button('⬅️ Volver', `agenda_r:${range}:${page}`)])
  return { text, reply_markup: { inline_keyboard: rows } }
}

/** Cancelar una cita es irreversible desde el bot: se pide confirmación. */
export function buildCancelConfirm(
  appointment,
  range,
  page = 0,
  timezone = DEFAULT_TZ
) {
  const a = appointment
  return {
    text:
      `¿Cancelar la cita con <b>${escapeHtml(a.client)}</b>?\n\n` +
      `🕘 ${formatRange(a.startAt, a.endAt, timezone)}`,
    reply_markup: {
      inline_keyboard: [
        [button('❌ Sí, cancelar', `agenda_yes:${target(a, range, page)}`)],
        [button('↩️ No, volver', `agenda_d:${target(a, range, page)}`)]
      ]
    }
  }
}
