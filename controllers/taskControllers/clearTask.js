import Task from '@/models/task.js'
import { isUserAuthorized } from '@/helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para manejar /clear y /confirmclear
 *
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const clearTask = async (ctx) => {
  try {
    // Extraigo el comando recibido y el ID del usuario
    const userId = ctx.from.id
    const command = ctx.message.text.trim()

    // Verifico si el usuario esta autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // /clear → Solicitud de confirmación
    if (command === '/clear') {
      const taskCount = await Task.countDocuments({ userId })

      if (taskCount === 0) {
        return ctx.reply('🤯 No tienes tareas activas que eliminar.')
      }

      return ctx.reply(
        '🤯 Estás a punto de eliminar TODAS tus tareas.\n' +
          'Si estás completamente seguro, escribe el comando:\n/confirmclear'
      )
    }

    // /confirmclear → Eliminación real de las tareas
    if (command === '/confirmclear') {
      const taskCount = await Task.countDocuments({ userId })

      if (taskCount === 0) {
        return ctx.reply('🤯 No tienes tareas activas que eliminar.')
      }

      await Task.deleteMany({ userId })

      return ctx.reply(
        `🫡 Se han eliminado tus ${taskCount} tareas. ¡Empezamos de cero!`
      )
    }

    // Si el comando no es reconocido dentro de este handler
    return ctx.reply('🤯 Comando no válido. Usa /clear para empezar.')
  } catch (error) {
    console.error(`😵‍💫 Error al gestionar comando clear: ${error.message}`)
    ctx.reply(
      '😵‍💫 Ocurrió un error al procesar tu solicitud. Intenta más tarde.'
    )
  }
}
