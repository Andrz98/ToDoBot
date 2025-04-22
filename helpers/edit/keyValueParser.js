// helpers/edit/keyValueParser.js
import { detectAndParseDate } from '../date/detectAndParseDate.js'

/**
 * Analiza un comando abreviado de edición:
 *   /edit old:Vieja name:"Nueva tarea" desc:"Nuevo texto" date:22/04/25 14:00
 *
 * Claves admitidas (case‑insensitive):
 *   old   → nombre actual   (obligatoria)
 *   name  → nuevo nombre    (opcional)
 *   desc  → nueva descripción (opcional)
 *   date  → nueva fecha     (opcional, soporta DD/MM/YY[YY] o humanizada)
 *
 * @param {string} raw Full text including "/edit ..."
 * @returns {object} { isValid, oldName, newName, newDescription, date }
 */
const TOKEN = /(\w+):"([^"]+)"|(\w+):([^\s]+)/g

export const keyValueParser = (raw) => {
  const pairs = [...raw.replace(/^\/edit\s*/i, '').matchAll(TOKEN)]
  if (pairs.length === 0) {
    return { isValid: false }
  }

  const data = {}
  for (const m of pairs) {
    const key = (m[1] || m[3]).toLowerCase()
    const val = (m[2] || m[4]).trim()
    data[key] = val
  }

  if (!data.old) {
    return { isValid: false }
  }

  let parsedDate = null
  if (data.date) {
    const { date } = detectAndParseDate([data.date])
    if (!date) {
      return { isValid: false }
    } // formato de fecha inválido
    parsedDate = date
  }

  return {
    isValid: true,
    oldName: data.old,
    newName: data.name || '',
    newDescription: data.desc || '',
    date: parsedDate
  }
}
