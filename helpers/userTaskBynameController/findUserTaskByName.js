import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Busca una tarea específica por nombre y userId del mensaje
 * Devuelve el objeto con: { task } o { error }
 *
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 * @returns {Promise<{ task?: object, error?: string }>} - Objeto con la tarea o error
 */

export const findUserTaskByName = async (ctx) => {
  // Extraigo el Id del usuario
  const userId = ctx.from.id

  // Extraigo el nombre de la tarea
  const taskName = ctx.message.text.split(' ').slice(1).join(' ').trim()

  // Valido que el nombre de la tarea esté presente
  if (!taskName) {
    return {
      error:
        '🤯 Debes escribir el nombre de la tarea. Ejemplo:\n/delete Comprar pan'
    }
  }

  // Verifico si el usuario esta autorizado a usar el bot
  if (!(await isUserAuthorized(ctx))) {
    return {
      error: '🥸 Debes estar autorizado para usar este bot.'
    }
  }

  // Busco la tarea por el userId y el name
  const task = await Task.findOne({ userId, name: taskName })

  // Valido si existe
  if (!task) {
    return {
      error: `🤯 No se encontro ninguna tarea llamada "${taskName}"`
    }
  }

  // Si todo esta correcto, entonces devuelvo la tarea
  return { task }
}
