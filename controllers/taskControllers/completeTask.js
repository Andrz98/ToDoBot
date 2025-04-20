import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para marcar una tarea como completada /done
 *
 * Formato obligatorio:
 * /done NombreExactoDeLaTarea
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const completeTask = async (ctx) => {
  try {
    // Validación de contexto

    const userId = ctx.from.id

    const rawText = ctx.text
    if (!rawText) {
      return ctx.reply(
        '🤯 No se pudo procesar tu mensaje. Asegúrate de que sea texto plano.'
      )
    }

    const input = rawText.replace(/^\/done\s*/, '').trim()

    if (!input) {
      return ctx.reply(
        '🤯 Debes proporcionar el nombre exacto de la tarea. Ejemplo:\n/done Comprar pan'
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

    if (task.completed) {
      return ctx.reply('Esta tarea ya ha sido completada previamente.')
    }

    task.completed = true
    await task.save()

    return ctx.reply(
      `Perfecto,¡Tarea completada!\n<b>${task.name}</b> ha sido marcada como finalizada.`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al completar la tarea:', error)
    ctx.reply('😵‍💫 Ocurrió un error al completar la tarea. Intenta más tarde.')
  }
}
