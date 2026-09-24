import { describe, it, expect } from 'vitest'
import {
  buildCalConfirm,
  buildCalIntro,
  buildCalStatus,
  buildDisconnectConfirm,
  calendarUrl,
  isValidEmail
} from '@/helpers/calendar/calendarView.js'

const callbacks = (markup) =>
  (markup.reply_markup ?? markup).inline_keyboard
    .flat()
    .map((b) => b.callback_data)

describe('isValidEmail', () => {
  it.each(['ana@gmail.com', 'ana.perez+citas@empresa.co.uk', 'a@b.io'])(
    'acepta %s',
    (email) => {
      expect(isValidEmail(email)).toBe(true)
    }
  )

  it.each([
    'ana',
    'ana@',
    '@gmail.com',
    'ana@gmail',
    'ana perez@gmail.com',
    'ana@@gmail.com',
    '<b>@gmail.com',
    `${'a'.repeat(65)}@gmail.com`,
    `a@${'b'.repeat(250)}.com`
  ])('rechaza %s', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })
})

describe('calendarUrl', () => {
  it('apunta al calendario, con el id codificado', () => {
    expect(calendarUrl('abc@group.calendar.google.com')).toBe(
      'https://calendar.google.com/calendar/u/0/r?cid=abc%40group.calendar.google.com'
    )
  })
})

describe('vistas de /calendar', () => {
  it('la introducción permite cancelar', () => {
    const { text, markup } = buildCalIntro()
    expect(text).toContain('como lector')
    expect(callbacks(markup)).toEqual(['cal_cancel'])
  })

  it('la confirmación muestra el correo y ofrece conectar, cambiar o cancelar', () => {
    const { text, markup } = buildCalConfirm('ana@gmail.com')
    expect(text).toContain('📧 ana@gmail.com')
    expect(callbacks(markup)).toEqual([
      'cal_confirm',
      'cal_change',
      'cal_cancel'
    ])
  })

  it('un aviso de error se antepone a la confirmación', () => {
    const { text } = buildCalConfirm('ana@gmail.com', '⚠️ Algo falló')
    expect(text.startsWith('⚠️ Algo falló\n\n')).toBe(true)
    expect(text).toContain('ana@gmail.com')
  })

  it('el estado escapa el HTML del correo y enlaza al calendario', () => {
    const { text, reply_markup } = buildCalStatus({
      email: 'a<b>&c@gmail.com',
      calendarId: 'abc@group.calendar.google.com'
    })
    expect(text).toContain('a&lt;b&gt;&amp;c@gmail.com')
    const [open, disconnect] = reply_markup.inline_keyboard.flat()
    expect(open.url).toBe(calendarUrl('abc@group.calendar.google.com'))
    expect(disconnect.callback_data).toBe('cal_disconnect')
  })

  it('desconectar pide confirmación y avisa de que las citas se conservan', () => {
    const { text, reply_markup } = buildDisconnectConfirm({
      email: 'ana@gmail.com'
    })
    expect(text).toContain('Tus citas siguen en el bot')
    expect(callbacks({ reply_markup })).toEqual([
      'cal_disconnect_yes',
      'cal_back'
    ])
  })
})
