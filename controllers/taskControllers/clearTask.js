import Task from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskControllers/isUserAuthorized.js'

/**
 * Controlador para solicitar la confirmación antes de eliminar todas las tareas /clear
 *
 *  @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const clearTask = async (ctx) => {
  try {
    // Extraigo el ID del usuario que envió el comando
    const userId = ctx.from.id

    // Verifico si el usuario esta autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Consulto si el usuario tiene tareas activas
    const taskCount = await Task.countDocuments({ userId })

    // Si no tiene tareas activas, respondemos con un mensaje informativo
    if (taskCount === 0) {
      return ctx.reply('🤯 No tienes tareas activas que eliminar.')
    }

    // Envío una advertencia al usuario para confirmar la eliminación de todas las tareas
    return ctx.reply(
      '🤯 Estás a punto de eliminar TODAS tus tareas.\n' +
        'Si estás completamente seguro, escribe el comando:\n/confirmclear'
    )
  } catch (error) {
    console.error(
      `😵‍💫 Error en confirmación de borrado masivo: ${error.message}`
    )
    ctx.reply(
      '😵‍💫 Ocurrió un error al procesar tu solicitud. Intenta más tarde.'
    )
  }
}
