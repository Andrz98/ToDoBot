import { formatDateEs } from '../date/formatDateEs.js'

// Escapa caracteres especiales para HTML en Telegram
const escapeHtml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Actualiza los campos de una tarea con los nuevos valores proporcionados
 *
 * @param {object} task - Objeto de tarea a actualizar
 * @param {object} param1 - Objeto con los nuevos valores
 * @param {string} param1.newName - Nuevo nombre de la tarea (opcional)
 * @param {string} param1.newDescription - Nueva descripción (opcional)
 * @param {Date} param1.date - Nueva fecha de recordatorio (opcional)
 * @param {string} timezone - Zona horaria del usuario
 * @returns {object} - Objeto con flag de actualización y array de cambios formateados en HTML
 */
export const updateTaskFields = (
  task,
  { newName, newDescription, date },
  timezone
) => {
  const changes = []
  let updated = false

  // Cambiar nombre
  if (newName && newName !== task.name) {
    task.name = newName
    updated = true
    changes.push(`<b>Nuevo nombre:</b> ${escapeHtml(newName)}`)
  }

  // Cambiar descripción
  if (newDescription && newDescription !== task.description) {
    task.description = newDescription
    updated = true
    changes.push(`<b>Descripción:</b> ${escapeHtml(newDescription)}`)
  }

  // Cambiar fecha de recordatorio
  if (date) {
    if (date < new Date()) {
      throw new Error('PAST_DATE')
    }
    task.reminderAt = date
    updated = true
    const formatted = formatDateEs(date, timezone)
    changes.push(`<b>Nueva fecha:</b> ${escapeHtml(formatted)}`)
  }

  return { updated, changes }
}
