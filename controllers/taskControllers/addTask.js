import Task from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorized.js'

/**
 * Controlador para agregar una tarea /add
 *
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const addTask = async (ctx) => {
  try {
    // Extraigo el comando del usuario que envío el comando
    const userId = ctx.from.id

    // Obtengo la descrición desde el texto del mensaje
    const taskDescription = ctx.message.text
      .split(' ')
      .slice(1)
      .join(' ')
      .trim()

    // Valido que haya contenido después del /add
    if (!taskDescription) {
      return ctx.reply(
        '🤯 Debes proporcionar una descripción de la tarea. Ejemplo:\n/add Comprar pan'
      )
    }

    //Verfico si el usuario está autoriado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Creo una nueva instancia del modelo task
    const newTask = new Task({
      userId,
      description: taskDescription
    })

    // Guardo la tarea en la base de datos
    await newTask.save()

    // Envio un mensaje de confirmación al usuario
    return ctx.reply(
      `🫡 La tarea se ha añadido correctamente: \n"${taskDescription}"`
    )
  } catch (error) {
    console.error(`😵‍💫Ha sucedido un error al añadir tu tarea: ${error.message}`)
    ctx.reply('😵‍💫Ha sucedido un error al añadir tu tarea. Intentalo nuevamente')
  }
}
