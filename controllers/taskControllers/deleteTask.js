import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTask } from '../../helpers/tasks/findTask.js'

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

    // 1) Validación básica del contexto
    const rawText = ctx.message?.text
    const userId = ctx.from?.id
    if (!rawText || !userId) {
      console.warn('⚠️ /delete recibido sin texto válido:', ctx.message)
      return ctx.reply('🤯 El mensaje recibido no es válido.')
    }

    // 2) Extraer nombre de la tarea
    const taskName = rawText.replace(/^\/delete\s*/i, '').trim()
    if (!taskName) {
      return ctx.reply(
        '<b>Formato correcto:</b>\n/delete NombreExactoDeLaTarea\n\n' +
          '<b>Ejemplo:</b>\n/delete Comprar pan',
        { parse_mode: 'HTML' }
      )
    }

    // 3) Comprobar autorización
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // 4) Buscar la tarea activa
    const task = await findTask(userId, { name: taskName, completed: false })
    if (!task) {
      return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${taskName}"`)
    }

    // 5) Eliminarla
    await task.deleteOne()

    // 6) Confirmar al usuario
    return ctx.reply(
      `La tarea <b>"${task.name}"</b> ha sido eliminada correctamente.`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al eliminar la tarea:', error)
    return ctx.reply(
      '😵‍💫 Ocurrió un error al eliminar la tarea. Intenta más tarde.'
    )
  }
}
