import { DateTime } from 'luxon'
import { parseHumanDate } from './parseHumanDate.js'

// Formatos de fecha estándar soportados
const formats = ['dd/MM/yy HH:mm', 'dd/MM/yyyy HH:mm', 'dd/MM/yy', 'dd/MM/yyyy']

/**
 * Recorre las lineas del mensaje e intenta parsear formatos estándar DD/MM/AAAA [HH:mm].
 * Si no encuentra, entonces llama internamente a parseHumanDate para probar formatos más humanos
 * que haya podido generar el usuario.
 *
 * @param {string[]} lines - Array de líneas del mensaje a parsear
 * @returns {object} - Objeto con la fecha parseada (o null) y el índice de la línea donde se encontró
 * @property {Date|null} date - La fecha parseada o null si no se encontró
 * @property {number} index - Índice de la línea donde se encontró la fecha (-1 si no se encontró)
 */
export const detectAndParseDate = (lines) => {
  // Iterar desde la última línea hacia arriba (es más probable que la fecha esté al final)
  for (let i = lines.length - 1; i >= 0; i--) {
    // Limpiar la línea de guiones iniciales y espacios
    const candidate = lines[i].replace(/^[-\s]+/, '')

    // Intentar con formatos estándar primero
    for (const format of formats) {
      const dateTime = DateTime.fromFormat(candidate, format, {
        zone: 'Europe/Madrid'
      })
      if (dateTime.isValid) {
        return { date: dateTime.toJSDate(), index: i }
      }
    }

    // Buscar patrones de fecha explícita en español
    const explicitPattern =
      /(?:🔹\s*)?(?:Fecha|fecha):\s*([^,]+,\s*\d{1,2}\s+de\s+[^\d,]+\s+de\s+\d{4}(?:,\s*\d{1,2}:\d{1,2})?)/i
    const match = candidate.match(explicitPattern)
    if (match) {
      const humanDate = parseHumanDate(match[1].trim())
      if (humanDate) {
        return { date: humanDate, index: i }
      }
    }

    // Buscar formatos de fecha relativos (hoy, mañana, etc.)
    const relativeDate = parseRelativeDate(candidate)
    if (relativeDate) {
      return { date: relativeDate, index: i }
    }
  }

  // No se encontró ninguna fecha
  return { date: null, index: -1 }
}

/**
 * Parsea fechas relativas como "hoy", "mañana", "próximo lunes", etc.
 *
 * @param {string} text - Texto a parsear
 * @returns {Date|null} - Fecha parseada o null si no se reconoce
 */
const parseRelativeDate = (text) => {
  const lowerText = text.toLowerCase().trim()

  if (lowerText === 'hoy') {
    return DateTime.now().setZone('Europe/Madrid').startOf('day').toJSDate()
  }

  if (lowerText === 'mañana' || lowerText === 'manana') {
    return DateTime.now()
      .setZone('Europe/Madrid')
      .plus({ days: 1 })
      .startOf('day')
      .toJSDate()
  }

  // Patrones para "próximo [día de la semana]"
  const weekdayMatch = lowerText.match(
    /pr[oó]ximo\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i
  )
  if (weekdayMatch) {
    const weekdays = {
      lunes: 1,
      martes: 2,
      miércoles: 3,
      miercoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
      sabado: 6,
      domingo: 7
    }

    const targetWeekday = weekdays[weekdayMatch[1].toLowerCase()]
    let dt = DateTime.now().setZone('Europe/Madrid')

    // Avanzar hasta encontrar el próximo día de la semana indicado
    while (dt.weekday !== targetWeekday) {
      dt = dt.plus({ days: 1 })
    }

    return dt.startOf('day').toJSDate()
  }

  return null
}
