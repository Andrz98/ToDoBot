import { Task } from '../../models/task.js'

/**
 * Busca una tarea por userId y nombre exacto o por _id.
 *
 * @param {string} userId      – ID de Telegram del usuario
 * @param {object} options
 * @param {string} [options.name]   – Nombre exacto de la tarea
 * @param {string} [options.id]     – ObjectId de la tarea
 * @returns {Promise<Task|null>}
 */
export async function findTask(userId, { name = null, id = null } = {}) {
  const query = { userId }
  if (id) {
    query._id = id
  } else if (name) {
    query.name = name
  }
  try {
    return await Task.findOne(query)
  } catch (err) {
    console.error('🦽 Error en findTask:', err)
    throw err
  }
}
