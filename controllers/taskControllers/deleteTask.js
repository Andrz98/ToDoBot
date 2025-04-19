import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para eliminar una tarea específica /delete
 *
 * Formato obligatorio:
 * /delete NombreExactoDeLaTarea
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const deleteTask = async (ctx) => {
  try {
    // Validación del contexto
    if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.from.id) {
      return ctx.reply('🤯 El mensaje recibido no es válido.')
    }

    const userId = ctx.from.id
    const input = ctx.message.text.replace(/^\/delete\s*/, '').trim()

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    if (!input) {
      return ctx.reply(
        '🤯 Debes escribir el nombre exacto de la tarea. Ejemplo:\n/delete Comprar pan'
      )
    }

    const taskName = input

    const task = await findTaskForController(userId, taskName)
    if (!task) {
      return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${taskName}"`)
    }

    await task.deleteOne()

    return ctx.reply(
      `La tarea <b>"${task.name}"</b> ha sido eliminada correctamente.`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al eliminar la tarea:', error)
    ctx.reply('😵‍💫 Ocurrió un error al eliminar la tarea. Intenta más tarde.')
  }
}
