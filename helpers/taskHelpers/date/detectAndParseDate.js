import { DateTime } from 'luxon'
import { parseHumanDate } from './parseHumanDate.js'

const formats = ['dd/MM/yy HH:mm', 'dd/MM/yyyy HH:mm', 'dd/MM/yy', 'dd/MM/yyyy']
const explicitPattern =
  /(?:🔹\s*)?(?:Fecha|fecha):\s*([^,]+,\s*\d{1,2}\s+de\s+[^\d,]+\s+de\s+\d{4}(?:,\s*\d{1,2}:\d{1,2})?)/i

/**
 * Detecta y parsea la fecha dentro de un array de líneas.
 * @param {string[]} lines
 * @param {string}     timeZone  – Zona horaria IANA
 * @returns {{ date: Date|null, index: number }}
 */
export const detectAndParseDate = (lines, timeZone = 'Europe/Madrid') => {
  const tryFormats = (text) => {
    for (const fmt of formats) {
      const dt = DateTime.fromFormat(text, fmt, { zone: timeZone })
      if (dt.isValid) {
        return dt.toJSDate()
      }
    }
    return null
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i].replace(/^[-\s]+/, '')
    // 1. Formatos estándar
    const std = tryFormats(candidate)
    if (std) {
      return { date: std, index: i }
    }

    // 2. Explicit “Fecha: …”
    const m = candidate.match(explicitPattern)
    if (m) {
      const human = parseHumanDate(m[1].trim(), timeZone)
      if (human) {
        return { date: human, index: i }
      }
    }

    // 3. Relativos (“hoy”, “mañana”, “próximo lunes”)
    const rel = parseRelativeDate(candidate, timeZone)
    if (rel) {
      return { date: rel, index: i }
    }
  }

  return { date: null, index: -1 }
}

/** @private */
const parseRelativeDate = (text, timeZone) => {
  const t = text.toLowerCase().trim()
  const now = DateTime.now().setZone(timeZone)

  if (t === 'hoy') {
    return now.startOf('day').toJSDate()
  }
  if (t === 'mañana' || t === 'manana') {
    return now.plus({ days: 1 }).startOf('day').toJSDate()
  }

  const wdMatch = t.match(
    /pr[oó]ximo\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i
  )
  if (wdMatch) {
    const map = {
      lunes: 1,
      martes: 2,
      miercoles: 3,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sabado: 6,
      sábado: 6,
      domingo: 7
    }
    const target = map[wdMatch[1].toLowerCase()]
    let dt = now
    while (dt.weekday !== target) {
      dt = dt.plus({ days: 1 })
    }
    return dt.startOf('day').toJSDate()
  }

  return null
}
