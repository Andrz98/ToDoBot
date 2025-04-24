import { Task } from '../../models/task.js'

/**
 * Recupera todas las tareas activas (no completadas) de un usuario.
 *
 * @param {string} userId – ID de Telegram del usuario
 * @returns {Promise<Task[]>}
 */
export async function findAllTasks(userId) {
  try {
    return await Task.find({ userId, completed: false }).sort({ reminderAt: 1 })
  } catch (err) {
    console.error('🦽 Error en findAllTasks:', err)
    throw err
  }
}
