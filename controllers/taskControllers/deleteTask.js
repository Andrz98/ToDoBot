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
    console.log('📦 deleteTask - preview:', {
      message_id: ctx.message?.message_id,
      text: ctx.message?.text,
      from: ctx.from?.id
    })

    // Validación del contexto
    const rawText = ctx.message.text
    if (!rawText || !ctx.from?.id) {
      console.warn('⚠️ /delete recibido sin texto válido:', ctx.message)
      return ctx.reply('🤯 El mensaje recibido no es válido.')
    }

    const userId = ctx.from.id
    const input = rawText.replace(/^\/delete\s*/, '').trim()

    // Validación específica para cuando el usuario solo envía el comando sin parámetros
    if (!input || input === ':') {
      return ctx.reply(
        '🧾 <b>Formato correcto:</b>\n/delete NombreExactoDeLaTarea\n\n<b>Ejemplo:</b>\n/delete Comprar pan',
        { parse_mode: 'HTML' }
      )
    }

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
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
