import cron from 'node-cron'
import { Appointment } from '../../models/appointment.js'
import { CalendarLink } from '../../models/calendarLink.js'
import { STATUS } from '../../helpers/appointments/status.js'
import { toGoogleEvent } from '../../helpers/calendar/googleEvent.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { deleteEvent, upsertEvent } from '../google/calendarClient.js'
import { sleep } from '../../utils/delayUtils/sleep.js'

// Google limita las escrituras seguidas sobre un mismo calendario: se espacian
const BATCH_SIZE = 20
const WRITE_GAP_MS = 300
// Con Google caído no tiene sentido seguir insistiendo cita por cita en este barrido
const MAX_CONSECUTIVE_FAILURES = 3

/** Refleja en Google el estado actual de la cita: una cancelada borra su evento. */
async function syncOne(appointment, link) {
  if (appointment.status === STATUS.CANCELLED) {
    await deleteEvent(link.calendarId, String(appointment._id))
    return
  }
  const timezone = await getUserTimezone(appointment.userId)
  await upsertEvent(link.calendarId, toGoogleEvent(appointment, timezone))
}

/**
 * Envía a Google las citas marcadas como pendientes (`gcalDirty`) de los
 * usuarios con calendario conectado. Cada cambio de una cita la marca de nuevo,
 * así que esta es la única vía de sincronización: si Google falla, se reintenta
 * en el siguiente barrido y el bot no se entera.
 */
export async function syncPendingAppointments() {
  const links = await CalendarLink.find().lean()
  if (links.length === 0) {
    return
  }
  const linkOf = new Map(links.map((link) => [link.userId, link]))

  // Las que llevan más tiempo sin intentarse van primero: una cita que falla
  // siempre (p. ej. su calendario se borró a mano) no deja sin turno a las demás
  const pending = await Appointment.find({
    gcalDirty: true,
    userId: { $in: [...linkOf.keys()] }
  })
    .sort({ gcalTriedAt: 1, updatedAt: 1 })
    .limit(BATCH_SIZE)
    .lean()

  let failures = 0
  for (const appointment of pending) {
    try {
      await syncOne(appointment, linkOf.get(appointment.userId))
      // Solo se marca como sincronizada si nadie la tocó mientras tanto
      await Appointment.updateOne(
        { _id: appointment._id, updatedAt: appointment.updatedAt },
        { gcalDirty: false, gcalTriedAt: null },
        { timestamps: false }
      )
      failures = 0
    } catch (error) {
      console.error(
        `😵‍💫 Error al sincronizar la cita ${appointment._id}:`,
        error.message
      )
      await Appointment.updateOne(
        { _id: appointment._id },
        { gcalTriedAt: new Date() },
        { timestamps: false }
      ).catch(() => {})
      if (++failures >= MAX_CONSECUTIVE_FAILURES) {
        break
      }
    }
    await sleep(WRITE_GAP_MS)
  }
}

let running = false

/** Barrido cada minuto. Si uno aún no ha terminado, el siguiente se salta. */
export const startCalendarSyncScheduler = () => {
  cron.schedule('* * * * *', async () => {
    if (running) {
      return
    }
    running = true
    try {
      await syncPendingAppointments()
    } catch (error) {
      console.error('😵‍💫 Error al sincronizar con Google:', error.message)
    } finally {
      running = false
    }
  })
}
