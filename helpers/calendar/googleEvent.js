import { STATUS } from '../appointments/status.js'

// Sin confirmar se ve como "provisional" en Google Calendar
const GOOGLE_STATUS = {
  [STATUS.PENDING]: 'tentative',
  [STATUS.CONFIRMED]: 'confirmed'
}

/**
 * Cita → evento de Google Calendar. El id del evento es el _id de la cita
 * (24 caracteres hexadecimales, válidos como id de Google): así sincronizar es
 * idempotente y no hace falta guardar ningún id de Google.
 *
 * Sin recordatorios propios de Google: los avisa el bot por Telegram.
 */
export const toGoogleEvent = (appointment, timeZone) => ({
  id: String(appointment._id),
  summary: appointment.client,
  location: appointment.location,
  description: appointment.notes,
  status: GOOGLE_STATUS[appointment.status] ?? 'confirmed',
  start: { dateTime: new Date(appointment.startAt).toISOString(), timeZone },
  end: { dateTime: new Date(appointment.endAt).toISOString(), timeZone },
  reminders: { useDefault: false }
})
