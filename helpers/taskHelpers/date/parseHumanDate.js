import { DateTime } from 'luxon'

/**
 * Convierte una fecha en español “humanizada” a objeto Date.
 *
 * @param {string} humanDate - Ej.: "jueves, 24 de abril de 2025, 22:00"
 * @param {string} timeZone  - Zona horaria IANA (ej. 'Europe/Madrid' o 'America/Bogota')
 * @returns {Date|null}      - Objeto Date parseado con zona horaria correcta, o null si falla
 */
export const parseHumanDate = (humanDate, timeZone = 'Europe/Madrid') => {
  try {
    // Diccionario para convertir nombre de mes a número
    const monthNames = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12
    }

    // Extrae día, mes, año, hora y minutos (si están presentes)
    const extract =
      /(?:.*?,\s*)?(\d{1,2})\s+de\s+([^\d,]+)\s+de\s+(\d{4})(?:,\s*(\d{1,2}):(\d{1,2}))?/i

    const match = humanDate.match(extract)
    if (!match) {
      return null
    }

    const day = Number(match[1])
    const monthName = match[2].toLowerCase()
    const year = Number(match[3])
    const hour = match[4] ? Number(match[4]) : 0
    const minute = match[5] ? Number(match[5]) : 0

    const month = monthNames[monthName]
    if (!month) {
      return null
    }

    // Creo la fecha en la zona horaria definida por el usuario.
    const dt = DateTime.fromObject(
      { year, month, day, hour, minute },
      { zone: timeZone }
    )

    return dt.isValid ? dt.toJSDate() : null
  } catch (err) {
    console.error('Error parseando fecha humanizada:', err)
    return null
  }
}
