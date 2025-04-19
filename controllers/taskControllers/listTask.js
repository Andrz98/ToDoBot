import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para manejar las tareas activas del usuario /list
 *
 * @param {Object} ctx - Contexto proporcionado por Telegraf
 */

export const listTasks = async (ctx) => {
  try {
    // Extraigo el ID del usuario que envío el comando
    const userId = ctx.from.id

    // Verifico si el usuario esta autorizado a usar el bot
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

    // Construyo la lista formateada para mostrar al usuario, con una línea por tarea
    const formattedList = tasks
      .map((task, index) => {
        const nameText = `<b>${index + 1}. ${task.name}</b>` // <-- Agrego negrita
        const descriptionText = task.description
          ? `\n<b>📄 Descripción:</b> ${task.description}`
          : ''
        const dateText = `<b>📅 Fecha:</b> ${task.reminderAt.toLocaleString(
          'es-ES',
          {
            dateStyle: 'full',
            timeStyle: 'short'
          }
        )}`
        return `${nameText}${descriptionText}\n${dateText}`
      })
      .join('\n\n') // <-- Agrego espacio entre tareas

    // Envío la lista al usuario con formato HTML habilitado
    return ctx.reply(
      `🗒️ Estas son tus tareas pendientes:\n\n${formattedList}`,
      { parse_mode: 'HTML' } // <-- Esto activa el renderizado en negrita
    )
  } catch (error) {
    console.error(`😵‍💫 Error al listar tareas: ${error.message}`)
    ctx.reply('😵‍💫 Ocurrió un error al mostrar tus tareas. Intenta más tarde.')
  }
}
