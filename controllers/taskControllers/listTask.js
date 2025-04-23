import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para manejar las tareas activas del usuario /list
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 */
export const listTasks = async (ctx) => {
  try {
    // Extraigo el ID del usuario que envió el comando
    const userId = ctx.from.id

    // Validación para comando con parámetros innecesarios
    const command = ctx.message.text.trim().toLowerCase()
    if (command !== '/list' && command.startsWith('/list')) {
      return ctx.reply(
        '🧾 <b>Formato correcto:</b>\n/list - Muestra la lista de todas tus tareas pendientes',
        { parse_mode: 'HTML' }
      )
    }

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Obtengo las tareas activas del usuario
    const tasks = await Task.find({ userId, completed: false }).sort({
      createdAt: 1
    })

    // Verifico si el usuario no tiene tareas activas
    if (tasks.length === 0) {
      return ctx.reply('🤯 No tienes tareas activas.')
    }

    // Construyo la lista formateada para mostrar al usuario
    const formattedList = tasks
      .map((task, index) => {
        const nameText = `<b>${index + 1}. ${task.name}</b>\n`
        const descriptionText = task.description
          ? `\n<b>🔸 Descripción:</b>\n ${task.description}`
          : ''
        const dateText = `\n<b>🔹 Fecha:</b>\n ${task.reminderAt.toLocaleString(
          'es-ES',
          { dateStyle: 'full', timeStyle: 'short' }
        )}`

        return `${nameText}${descriptionText}${dateText}`
      })
      .join('\n\n') // Espacio entre tareas

    // Envío la lista al usuario
    return ctx.reply(
      `🗒️ Estas son tus tareas pendientes:\n\n${formattedList}`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al listar tareas:', error)
    ctx.reply('😵‍💫 Ocurrió un error al mostrar tus tareas.')
  }
}
