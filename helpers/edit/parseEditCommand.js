import { detectAndParseDate } from '../date/detectAndParseDate.js'

/**
 * Parsea el comando de edición y extrae los campos necesarios
 *
 * @param {string} raw - Texto completo del mensaje recibido
 * @returns {object} Objeto con los campos parseados (oldName, newName, newDescription, date) y un flag isValid
 */
export const parseEditCommand = (raw) => {
  // Eliminar el comando /edit y espacios adicionales
  const content = raw.replace(/^\/edit\s*/i, '').trim()

  // Validar que exista contenido
  if (!content || content === ':') {
    return { isValid: false }
  }

  // Separar el mensaje en líneas y limpiar
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // Si no hay líneas, el comando no es válido
  if (lines.length === 0) {
    return { isValid: false }
  }

  // Detectar y parsear la fecha (si existe)
  const { date, index } = detectAndParseDate(lines)

  // Extraer el contenido sin la línea de fecha
  const withoutDate =
    index >= 0 ? lines.slice(0, index).join('\n').trim() : lines[0].trim()

  // Parsear los campos separados por guiones
  let parts = []
  if (withoutDate.startsWith('- ')) {
    // Caso especial: cuando el nombre comienza con guión
    parts = ['-'].concat(withoutDate.substring(2).split(' - '))
  } else {
    parts = withoutDate.split(' - ')
  }

  // Extraer los campos individuales
  const oldName = parts[0]?.trim() || ''
  const newName = parts[1]?.trim() === '-' ? '' : parts[1]?.trim() || ''
  const newDescription = parts[2]?.trim() === '-' ? '' : parts[2]?.trim() || ''

  // Validar que exista al menos el nombre original
  if (!oldName) {
    return { isValid: false }
  }

  // Retornar todos los campos parseados
  return {
    isValid: true,
    oldName,
    newName,
    newDescription,
    date
  }
}
