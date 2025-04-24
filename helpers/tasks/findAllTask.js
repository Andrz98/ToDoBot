// helpers/tasks/findAllTasks.js
import { Task } from '../../models/task.js'

/**
 * Devuelve todas las tareas *activas* de un usuario,
 * ordenadas por fecha de recordatorio ascendente.
 */
export async function findAllTasks(userId) {
  try {
    return await Task.find({ userId, completed: false })
      .sort({ reminderAt: 1 })
      .lean() // ✔️ usar `.lean()` para devolver plain JS objects, optimiza rendimiento
  } catch (err) {
    console.error('Error en findAllTasks:', err)
    throw err
  }
}
