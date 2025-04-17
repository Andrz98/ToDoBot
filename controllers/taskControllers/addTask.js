import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para agregar una tarea /add
 *
 * Formatos aceptados:
 * /add Comprar pan 21/04/2025
 * /add Reunión 2025-04-22
 * /add Ir al dentista para el 30/04/2025
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const addTask = async (ctx) => {
  try {
    // Extraigo el comando del usuario que envío el comando
    const userId = ctx.from.id

    // Obtengo el contenido del mensaje del usuario después del coamndo /add
    const input = ctx.message.text.replace(/^\/add\s*/, '').trim()

    // Busca una fecha con formato dd/mm/aaaa o yyyy-mm-dd
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/
    const dateMatch = input.match(dateRegex)

    // Verifico si el mensaje contiene una fecha, sino lo hace muestro un error
    if (!dateMatch) {
      return ctx.reply(
        '🗓️ Para sacar el máximo rendimiento a tus tareas, por favor, inrtoduce una fecha válida en el mensaje. Ejemplo:\n/add Llamar médico 22/04/2025'
      )
    }

    const rawDate = dateMatch[0]
    const parsedDate = new Date(
      rawDate.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3')
    )

    if (isNaN(parsedDate.getTime())) {
      return ctx.reply(
        '🗓️ La fecha no es válida. Usa el formato DD/MM/AAAA o AAAA-MM-DD.'
      )
    }

    if (parsedDate < new Date()) {
      return ctx.reply('⌚ La fecha debe ser posterior a la fecha actual.')
    }

    const taskName = input.replace(rawDate, '').trim()

    // Verifico que el mensaje contenga el nombre de la tarea antes que la fecha
    if (!taskName) {
      return ctx.reply(
        '🤯 Debes proporcionar el nombre de la tarea antes de la fecha.'
      )
    }

    //Verfico si el usuario está autoriado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Creo una nueva instancia del modelo task
    const newTask = new Task({
      userId,
      name: taskName,
      reminderAt: parsedDate
    })

    // Guardo la tarea en la base de datos
    await newTask.save()

    // Envio un mensaje de confirmación al usuario
    return ctx.reply(
      `🫡 Tarea registrada: "${taskName}"\n📅 Recordatorio el: ${parsedDate.toLocaleDateString('es-ES')}`
    )
  } catch (error) {
    if (error.code === 11000) {
      return ctx.reply(
        '🤯 Ya tienes una tarea con ese nombre. Por favor, elige otro nombre para la tarea.'
      )
    }
    console.error(`😵‍💫Ha sucedido un error al añadir tu tarea: ${error.message}`)
    ctx.reply('😵‍💫Ha sucedido un error al añadir tu tarea. Intentalo nuevamente')
  }
}
