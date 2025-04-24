import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTask } from '../../helpers/tasks/findTask.js'

/**
 * Controlador para marcar una tarea como completada /done
 */
export const completeTask = async (ctx) => {
  try {
    const userId = ctx.from.id
    const rawText = ctx.message?.text
    if (!rawText) {
      return ctx.reply(
        '🤯 No se pudo procesar tu mensaje. Asegúrate de que sea texto plano.'
      )
    }

    const taskName = rawText.replace(/^\/done\s*/i, '').trim()
    if (!taskName) {
      return ctx.reply(
        '🧾 <b>Formato correcto:</b>\n/done NombreExactoDeLaTarea\n\n<b>Ejemplo:</b>\n/done Comprar pan',
        { parse_mode: 'HTML' }
      )
    }

    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    const task = await findTask(userId, { name: taskName })
    if (!task) {
      return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${taskName}".`)
    }

    if (task.completed) {
      return ctx.reply('⚠️ Esta tarea ya está completada.')
    }

    task.completed = true
    await task.save()

    return ctx.reply(
      `Perfecto, ¡tarea completada!\n<b>${task.name}</b> ha sido marcada como finalizada.`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al completar la tarea:', error)
    return ctx.reply(
      '😵‍💫 Ocurrió un error al completar la tarea. Intenta más tarde.'
    )
  }
}
