import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
import {
  AGENDA_PAGE_SIZE,
  agendaRange,
  buildAgendaDetail,
  buildAgendaPage,
  buildAptMenu,
  buildDurationMenu,
  formatDuration,
  formatRange,
  isValidDuration
} from '@/helpers/appointments/appointmentView.js'

const TZ = 'Europe/Madrid'
const callbacks = (markup) =>
  (markup.reply_markup ?? markup).inline_keyboard
    .flat()
    .map((b) => b.callback_data)

const apt = (n, extra = {}) => ({
  _id: `id${n}`,
  client: `Cliente ${n}`,
  status: 'pending',
  startAt: new Date('2099-06-01T08:00:00Z'),
  endAt: new Date('2099-06-01T09:00:00Z'),
  ...extra
})

describe('formatDuration / isValidDuration', () => {
  it.each([
    [30, '30 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [120, '2 h']
  ])('%i min → %s', (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label)
  })

  it.each([
    [5, true],
    [1440, true],
    [4, false],
    [1441, false],
    [30.5, false],
    [NaN, false]
  ])('isValidDuration(%s) → %s', (minutes, expected) => {
    expect(isValidDuration(minutes)).toBe(expected)
  })
})

describe('agendaRange', () => {
  // 15:30 en Madrid: el día empieza a las 00:00 locales, no a las 00:00 UTC
  const now = DateTime.fromISO('2099-06-01T15:30:00', { zone: TZ })

  it('hoy = el día natural del usuario', () => {
    const { from, to } = agendaRange('today', TZ, now)
    expect(from).toEqual(new Date('2099-05-31T22:00:00Z'))
    expect(to).toEqual(new Date('2099-06-01T22:00:00Z'))
  })

  it('mañana = el día siguiente', () => {
    const { from, to } = agendaRange('tomorrow', TZ, now)
    expect(from).toEqual(new Date('2099-06-01T22:00:00Z'))
    expect(to).toEqual(new Date('2099-06-02T22:00:00Z'))
  })

  it('semana = 7 días desde hoy', () => {
    const { from, to } = agendaRange('week', TZ, now)
    expect(from).toEqual(new Date('2099-05-31T22:00:00Z'))
    expect(to).toEqual(new Date('2099-06-07T22:00:00Z'))
  })

  it('respeta la zona horaria del usuario', () => {
    const { from } = agendaRange('today', 'America/Bogota', now)
    // 15:30 Madrid = 08:30 Bogotá → el día de Bogotá empieza a las 05:00 UTC
    expect(from).toEqual(new Date('2099-06-01T05:00:00Z'))
  })
})

describe('buildAptMenu', () => {
  it('vacío: pide los obligatorios y no ofrece confirmar', () => {
    const { text, markup } = buildAptMenu({}, TZ)
    expect(text).toContain('Nueva cita')
    expect(text).toContain('Completa los campos obligatorios')
    expect(callbacks(markup)).not.toContain('apt_confirm')
    expect(callbacks(markup)).toContain('apt_cancel')
  })

  it('con cliente e inicio ofrece confirmar', () => {
    const { text, markup } = buildAptMenu(
      { client: 'Ana', startAt: '2099-06-01T08:00:00.000Z', durationMin: 90 },
      TZ
    )
    expect(text).toContain('👤 Cliente: Ana')
    expect(text).toContain('⏱️ Duración: 1 h 30 min')
    expect(callbacks(markup)).toContain('apt_confirm')
  })

  it('en edición cambia el título y el botón', () => {
    const { text, markup } = buildAptMenu(
      { id: 'x', client: 'Ana', startAt: '2099-06-01T08:00:00.000Z' },
      TZ
    )
    expect(text).toContain('Editar cita')
    const labels = markup.reply_markup.inline_keyboard.flat().map((b) => b.text)
    expect(labels).toContain('✅ Guardar cambios')
  })

  it('un solape se avisa pero no quita el botón de confirmar', () => {
    const { text, markup } = buildAptMenu(
      { client: 'Ana', startAt: '2099-06-01T08:00:00.000Z' },
      TZ,
      apt(1, { client: 'Luis' })
    )
    expect(text).toContain('⚠️ Se solapa con Luis (10:00–11:00)')
    expect(callbacks(markup)).toContain('apt_confirm')
  })
})

describe('buildDurationMenu', () => {
  it('marca la duración actual y ofrece otra y volver', () => {
    const { markup } = buildDurationMenu(90)
    const labels = markup.reply_markup.inline_keyboard.flat().map((b) => b.text)
    expect(labels).toContain('✅ 1 h 30 min')
    expect(callbacks(markup)).toEqual(
      expect.arrayContaining(['apt_dur_30', 'apt_dur_custom', 'apt_back'])
    )
  })
})

describe('buildAgendaPage', () => {
  it('lista las citas con hora local y estado, y marca la pestaña activa', () => {
    const { text, reply_markup } = buildAgendaPage([apt(1)], 'today', 0, TZ)
    expect(text).toContain('Agenda · Hoy (1)')
    const buttons = reply_markup.inline_keyboard.flat()
    expect(buttons.map((b) => b.text)).toEqual(
      expect.arrayContaining([
        '• Hoy',
        'Mañana',
        'Semana',
        '⏳ 10:00 · Cliente 1'
      ])
    )
    expect(callbacks({ reply_markup })).toContain('agenda_d:id1:today:0')
  })

  it('en la vista semanal cada cita lleva su fecha', () => {
    const { reply_markup } = buildAgendaPage([apt(1)], 'week', 0, TZ)
    const labels = reply_markup.inline_keyboard.flat().map((b) => b.text)
    expect(labels).toContain('⏳ 01/06 10:00 · Cliente 1')
  })

  it('pagina y ajusta la página pedida al rango válido', () => {
    const many = Array.from({ length: AGENDA_PAGE_SIZE + 3 }, (_, i) => apt(i))
    const { text, reply_markup } = buildAgendaPage(many, 'today', 99, TZ)
    expect(text).toContain('página 2/2')
    const items = callbacks({ reply_markup }).filter((c) =>
      c.startsWith('agenda_d:')
    )
    expect(items).toHaveLength(3)
    expect(callbacks({ reply_markup })).toContain('agenda_r:today:0')
  })

  it('vacía: lo dice y ofrece crear una cita', () => {
    const { text, reply_markup } = buildAgendaPage([], 'tomorrow', 0, TZ)
    expect(text).toContain('No tienes citas')
    expect(callbacks({ reply_markup })).toContain('menu_cita')
  })
})

describe('buildAgendaDetail', () => {
  it('escapa el HTML de los textos del usuario', () => {
    const { text } = buildAgendaDetail(
      apt(1, { client: 'a<b>&c', location: '<i>x</i>', notes: '<u>n</u>' }),
      'today',
      0,
      TZ
    )
    expect(text).toContain('<b>a&lt;b&gt;&amp;c</b>')
    expect(text).toContain('&lt;i&gt;x&lt;/i&gt;')
    expect(text).toContain('&lt;u&gt;n&lt;/u&gt;')
  })

  it('confirmar solo se ofrece a las citas sin confirmar', () => {
    const pending = buildAgendaDetail(apt(1), 'today', 0, TZ)
    const confirmed = buildAgendaDetail(
      apt(1, { status: 'confirmed' }),
      'today',
      0,
      TZ
    )
    expect(callbacks({ reply_markup: pending.reply_markup })).toContain(
      'agenda_ok:id1:today:0'
    )
    expect(callbacks({ reply_markup: confirmed.reply_markup })).not.toContain(
      'agenda_ok:id1:today:0'
    )
  })

  it('formatRange une inicio y hora de fin en la zona del usuario', () => {
    expect(
      formatRange(
        new Date('2099-06-01T08:00:00Z'),
        new Date('2099-06-01T09:30:00Z'),
        TZ
      )
    ).toMatch(/10:00.* – 11:30$/)
  })
})
