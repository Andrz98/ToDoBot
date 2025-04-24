import { formatDateEs } from '../date/formatDateEs.js'

/**
 * Actualiza los campos de una tarea con los nuevos valores proporcionados
 *
 * @param {object} task - Objeto de tarea a actualizar
 * @param {object} param1 - Objeto con los nuevos valores
 * @param {string} param1.newName - Nuevo nombre de la tarea (opcional)
 * @param {string} param1.newDescription - Nueva descripción (opcional)
 * @param {Date} param1.date - Nueva fecha de recordatorio (opcional)
 * @returns {object} - Objeto con flag de actualización y cambios realizados
 */
export const updateTaskFields = (
  task,
  { newName, newDescription, date },
  timezone
) => {
  const changes = []
  let updated = false

  // Verificar si el nuevo nombre es válido y no coincide con formato de fecha
  if (newName && newName !== task.name) {
    task.name = newName
    updated = true
    changes.push(`Nuevo nombre: ${newName}`)
  }

  // Verificar si la nueva descripción es válida y no coincide con formato de fecha
  if (newDescription && newDescription !== task.description) {
    task.description = newDescription
    updated = true
    changes.push(`Descripción: ${newDescription}`)
  }

  // Verificar y actualizar la fecha si se proporcionó
  if (date) {
    // Valida que la fecha no sea pasada
    if (date < new Date()) {
      throw new Error('PAST_DATE')
    }
    task.reminderAt = date
    updated = true

    // Formatear la nueva fecha según la zona horaria del usuario
    const formatted = formatDateEs(date, timezone)
    changes.push(`Nueva fecha: ${formatted}`)
  }
  // Devuelvo el flag y el mensaje convinado
  return { updated, changes }
}
