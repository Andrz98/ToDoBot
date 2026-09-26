import { Markup } from 'telegraf'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { FINISH_ACTION_LABEL } from '../replyMessages/genericReplyMessages.js'

const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]+\.[^\s@<>]+$/
const MAX_EMAIL_LENGTH = 254

export const isValidEmail = (value) =>
  value.length <= MAX_EMAIL_LENGTH && EMAIL.test(value)

const button = (text, data) => Markup.button.callback(text, data)
const keyboard = (rows) => ({
  reply_markup: Markup.inlineKeyboard(rows).reply_markup
})

/** Enlace para añadir el calendario a la lista del usuario (respaldo de la invitación por correo). */
export const calendarUrl = (calendarId) =>
  `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`

/** Paso 1 de /calendar: explica qué se va a hacer. El correo se pide aparte, con force-reply. */
export const buildCalIntro = () => ({
  text:
    '🗓️ Conectar Google Calendar\n\n' +
    'Crearé un calendario "TuttoFatto" con tus citas y lo compartiré contigo ' +
    'como lector: se ve en Google Calendar, pero las citas se gestionan desde el bot.\n\n' +
    'Escribe el correo de tu cuenta de Google.',
  markup: keyboard([[button(FINISH_ACTION_LABEL, 'cal_cancel')]])
})

/** Paso 2: el correo puede tener erratas y se comparte información de clientes, así que se confirma. */
export const buildCalConfirm = (email, banner) => ({
  text:
    (banner ? `${banner}\n\n` : '') +
    '🗓️ Conectar Google Calendar\n\n' +
    `📧 ${email}\n\n` +
    'Compartiré tu calendario con este correo. ¿Es correcto?',
  markup: keyboard([
    [button('✅ Conectar', 'cal_confirm')],
    [button('✏️ Cambiar correo', 'cal_change')],
    [button(FINISH_ACTION_LABEL, 'cal_cancel')]
  ])
})

/** Estado de /calendar cuando ya está conectado. */
export const buildCalStatus = (link) => ({
  text:
    '🗓️ <b>Google Calendar conectado</b>\n\n' +
    `📧 ${escapeHtml(link.email)}\n\n` +
    '📩 Si aún no lo ves, abre la invitación que Google te envió por correo y pulsa «Unirme al calendario compartido».\n\n' +
    'Es de solo lectura: las citas se gestionan desde el bot.',
  reply_markup: {
    inline_keyboard: [
      [
        Markup.button.url(
          '🔗 Abrir en Google Calendar',
          calendarUrl(link.calendarId)
        )
      ],
      [button('🔌 Desconectar', 'cal_disconnect')]
    ]
  }
})

export const buildDisconnectConfirm = (link) => ({
  text:
    `¿Desconectar <b>${escapeHtml(link.email)}</b>?\n\n` +
    'Se borrará el calendario de Google. Tus citas siguen en el bot.',
  reply_markup: {
    inline_keyboard: [
      [button('🔌 Sí, desconectar', 'cal_disconnect_yes')],
      [button('↩️ No, volver', 'cal_back')]
    ]
  }
})
