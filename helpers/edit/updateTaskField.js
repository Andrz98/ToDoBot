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
export const updateTaskFields = (task, { newName, newDescription, date }) => {
  const changes = []
  let updated = false

  // Verificar si el nuevo nombre es válido y no coincide con formato de fecha
  if (
    newName &&
    newName !== task.name &&
    !newName.match(/^\d{2}\/\d{2}\/\d{2,4}/)
  ) {
    task.name = newName
    updated = true
    changes.push(`🔺 Nuevo nombre: ${newName}`)
  }

  // Verificar si la nueva descripción es válida y no coincide con formato de fecha
  if (
    newDescription &&
    newDescription !== task.description &&
    !newDescription.match(/^\d{2}\/\d{2}\/\d{2,4}/)
  ) {
    task.description = newDescription
    updated = true
    changes.push(`🔸 Descripción: ${newDescription}`)
  }

  // Verificar y actualizar la fecha si se proporcionó
  if (date) {
    if (date < new Date()) {
      throw new Error('PAST_DATE')
    }
    task.reminderAt = date
    updated = true

    // La zona horaria se determina según la configuración del usuario
    // Por defecto se usa Europe/Madrid si no se especifica
    const userTimezone = task.user?.timezone || 'Europe/Madrid'
    changes.push(`🔹 Nueva fecha: ${formatDateEs(date, userTimezone)}`)
  }

  return { updated, changes }
}
