import { DateTime } from 'luxon'
import { parseHumanDate } from './parseHumanDate.js'

/**
 * Recorre las lineas del mensaje e intenta parsear formatos estanda DD/MM/AAAA [HH:mm].
 * Si no encuentra, entonces llama internamente a parseHumanDate para probar el formato más humano que haya podido generar el *
 * usuario
 *
 * @param {string} message El mensaje a parsear
 * @returns {Date} La fecha parseada
 */
const formats = ['dd/MM/yy HH:mm', 'dd/MM/yyyy HH:mm', 'dd/MM/yy', 'dd/MM/yyyy']

export const detectAndParseDate = (lines) => {
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i].replace(/^[-\s]+/, '')

    for (const f of formats) {
      const d = DateTime.fromFormat(candidate, f, { zone: 'Europe/Madrid' })
      if (d.isValid) {
        return { date: d.toJSDate(), index: i }
      }
    }

    const explicit =
      /(?:🔹\s*)?(?:Fecha|fecha):\s*([^,]+,\s*\d{1,2}\s+de\s+[^\d,]+\s+de\s+\d{4}(?:,\s*\d{1,2}:\d{1,2})?)/i
    const m = candidate.match(explicit)
    if (m) {
      const human = parseHumanDate(m[1].trim())
      if (human) {
        return { date: human, index: i }
      }
    }
  }
  return { date: null, index: -1 }
}
