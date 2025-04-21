import { formatDateEsMadrid } from '../date/formatDateEs.js'

export const updateTaskFields = (task, { newName, newDescription, date }) => {
  const changes = []
  let updated = false

  if (newName && newName !== task.name) {
    task.name = newName
    updated = true
    changes.push(`🔺 Nuevo nombre: ${newName}`)
  }

  if (newDescription && newDescription !== task.description) {
    task.description = newDescription
    updated = true
    changes.push(`🔸 Descripción: ${newDescription}`)
  }

  if (date) {
    if (date < new Date()) {
      throw new Error('PAST_DATE')
    }
    task.reminderAt = date
    updated = true
    changes.push(`🔹 Nueva fecha: ${formatDateEsMadrid(date)}`)
  }

  return { updated, changes }
}
