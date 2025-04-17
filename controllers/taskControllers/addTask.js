import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para agregar una tarea /add
 *
 * Formato aceptado:
 * /add Comprar pan 22/04/2025 10:00
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const addTask = async (ctx) => {
  try {
    // Extraigo el comando del usuario que envío el comando
    const userId = ctx.from.id

    // Obtengo el contenido del mensaje del usuario después del coamndo /add
    const input = ctx.message.text.replace(/^\/add\s*/, '').trim()

    // Expresión regular para fecha + hora: DD/MM/YYYY HH:mm o YYYY-MM-DD HH:mm
    const datetimeRegex =
      /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})|(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/ // <-- esto es lo que he cambiado en el código (para añadir la hora)
    const match = input.match(datetimeRegex) // <-- esto es lo que he cambiado en el código (para añadir la hora)

    // Verifico si el mensaje contiene fecha y hora
    if (!match) {
      return ctx.reply(
        '🗓️ Debes incluir una fecha y hora válidas. Ejemplo:\n/add Comprar pan 22/04/2025 10:00'
      )
    }

    const rawDateTime = match[0] // <-- esto es lo que he cambiado en el código (para añadir la hora)

    // Reemplazo formato si es DD/MM/YYYY HH:mm → MM/DD/YYYY HH:mm
    const normalized = rawDateTime.replace(
      // <-- esto es lo que he cambiado en el código
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})$/,
      '$2/$1/$3 $4'
    )

    const parsedDate = new Date(normalized) // <-- esto es lo que he cambiado en el código (para añadir la hora)

    // Verifico que la fecha sea válida
    if (isNaN(parsedDate.getTime())) {
      return ctx.reply(
        '🕒 La fecha y hora no son válidas. Usa DD/MM/AAAA HH:mm o YYYY-MM-DD HH:mm'
      )
    }

    // Verifico que la fecha y hora sean futuras
    if (parsedDate < new Date()) {
      return ctx.reply(
        '⌚ La fecha y hora deben ser posteriores al momento actual.'
      )
    }

    // Extraigo el nombre de la tarea antes de la fecha y hora
    const taskName = input.replace(rawDateTime, '').trim() // <-- esto es lo que he cambiado en el código (para añadir la hora)

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
      reminderAt: parsedDate // <-- esto es lo que he cambiado en el código (para añadir la hora)
    })

    // Guardo la tarea en la base de datos
    await newTask.save()

    // Envio un mensaje de confirmación al usuario
    return ctx.reply(
      `🫡 Tarea registrada: "${taskName}"\n📅 Recordatorio: ${parsedDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}` // <-- esto es lo que he cambiado en el código (para añadir la hora)
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
