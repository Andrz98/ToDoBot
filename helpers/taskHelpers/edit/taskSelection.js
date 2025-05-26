import { Task } from '../../../models/task.js'
import { Markup } from 'telegraf'

/**
 * Genera un teclado inline con las tareas activas del usuario
 * @param {string} userId - ID de Telegram del usuario
 * @param {string} prefix - Prefijo para el callback_data (ej: 'select_edit', 'select_delete')
 * @returns {Promise<{ reply_markup: object } | null>} Teclado inline o null si no hay tareas
 */

export async function getTaskSelectionKeyboard(userId, prefix = 'select_edit') {
  const tasks = await Task.find({ userId, completed: false }).sort({
    createdAt: -1
  })

  if (!tasks || tasks.length === 0) {
    return null
  }

  const buttons = tasks.map((task) => [
    Markup.button.callback(task.name, `${prefix}_${task._id}`)
  ])

  return {
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup
  }
}
