import { Task } from '../../models/task.js'

/**
 * Busca una tarea por userId y nombre exacto (solo para sub-controladores)
 *
 * Este helper está diseñado para controladores como /edit, /done, etc.
 * que ya manejan la validación y el parsing de argumentos.
 *
 * @param {string} userId - ID del usuario de Telegram
 * @param {string} taskName - Nombre exacto de la tarea
 * @returns {Promise<Task|null>} - Retorna la tarea si la encuentra, o null si no existe
 */
export const findTaskForController = async (
  userId,
  taskName = null,
  taskId = null
) => {
  try {
    const query = { userId }
    if (taskId) {
      query._id = taskId
    } else {
      query.name = taskName
    }
    const task = await Task.findOne(query)
    return task || null
  } catch (error) {
    console.error('🦽 Error en findTaskForController:', error)
    throw error
  }
}

/**
 * Recupera todas las tareas de un usuario, ordenadas por fecha de recordatorio.
 *
 * @param {string} userId – ID del usuario de Telegram
 * @returns {Promise<Task[]>} – Array de tareas (vacío si no hay ninguna)
 */
export const findAllTasksForController = async (userId) => {
  try {
    return await Task.find({ userId, completed: false }) // Solo filtra tareas activas que no hayan sido completadas
      .sort({ reminderAt: 1 })
  } catch (error) {
    console.error('🦽 Error en findAllTasksForController:', error)
    throw error
  }
}
