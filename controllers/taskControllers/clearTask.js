import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para manejar /clear y /confirmclear
 *
 * Separar lógica de /clear y /confirmclear para facilitar el mantenimiento (más adelante)
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const clearTask = async (ctx) => {
  try {
    // Extraigo el ID del usuario y normalizo el comando recibido
    const userId = ctx.from.id
    const command = ctx.message.text.trim().toLowerCase()

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // /clear → Solicitud de confirmación
    if (command.startsWith('/clear')) {
      const taskCount = await Task.countDocuments({ userId })

      if (taskCount === 0) {
        return ctx.reply('🤯 No tienes tareas activas que eliminar.')
      }

      return ctx.reply(
        `🤯 Estás a punto de eliminar <b>${taskCount}</b> tareas activas.\n` +
          'Si estás completamente segur@, escribe el comando:\n/confirmclear',
        { parse_mode: 'HTML' }
      )
    }

    // /confirmclear → Eliminación real de las tareas
    if (command.startsWith('/confirmclear')) {
      const result = await Task.deleteMany({ userId })

      return ctx.reply(
        `${result.deletedCount} tarea(s) eliminadas correctamente.`
      )
    }

    // Comando desconocido (fallback interno)
    return ctx.reply('🤯 Comando no reconocido. Usa /clear o /confirmclear.')
  } catch (error) {
    console.error('😵‍💫 Error en clearTask:', error)
    return ctx.reply('😵‍💫 Ocurrió un error al intentar eliminar tus tareas.')
  }
}
