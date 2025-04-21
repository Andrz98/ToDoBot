/**
 * Convierte una fecha en español “humanizada” a objeto Date.
 *
 * @param {string} humanDate Ej.: "jueves, 24 de abril de 2025, 22:00"
 * @returns {Date|null}      Date o null si la cadena no se puede parsear
 */
export const parseHumanDate = (humanDate) => {
  try {
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

    const regex =
      /(?:.*?,\s*)?(\d{1,2})\s+de\s+([^\d,]+)\s+de\s+(\d{4})(?:,\s*(\d{1,2}):(\d{1,2}))?/i
    const match = humanDate.match(regex)
    if (!match) {
      return null
    }

    const day = Number(match[1])
    const monthName = match[2].toLowerCase()
    const year = Number(match[3])
    const hour = match[4] ? Number(match[4]) : 0
    const minute = match[5] ? Number(match[5]) : 0

    if (!monthNames[monthName]) {
      return null
    }

    const month = monthNames[monthName] - 1 // JS months 0‑11
    return new Date(year, month, day, hour, minute)
  } catch (err) {
    console.error('Error parseando fecha humanizada:', err)
    return null
  }
}
