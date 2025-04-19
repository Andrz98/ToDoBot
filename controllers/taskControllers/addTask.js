import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para agregar una tarea /add
 *
 * Formato aceptado:
 * /add Nombre de la tarea - Descripción (opcional) - Fecha
 * Ejemplo:
 * /add Llamar médico - Confirmar cita con la clínica - 22/04/2025 10:00
 *
 * @param {object} ctx - Objeto de contexto proporcionado por Telegraf
 */

export const addTask = async (ctx) => {
  try {
    // Extraigo el ID del usuario que envió el comando
    const userId = ctx.from.id

    // Obtengo el contenido del mensaje del usuario después del comando /add
    const input = ctx.message.text.replace(/^\/add\s*/, '').trim()

    const parts = input.split(' - ')

    // Verifico que al menos se proporcionen nombre y fecha
    if (parts.length < 2) {
      return ctx.reply(
        '🤯 Formato incorrecto. Usa:\n/add Nombre - [Descripción opcional] - DD/MM/AAAA HH:mm'
      )
    }

    const taskName = parts[0]?.trim()
    const taskDescription = parts.length === 3 ? parts[1].trim() : ''
    const rawDateTime = parts.length === 3 ? parts[2].trim() : parts[1].trim()

    // Expresión regular para fecha + hora: DD/MM/YYYY HH:mm o YYYY-MM-DD HH:mm
    const datetimeRegex =
      /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})|(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/
    const match = rawDateTime.match(datetimeRegex)

    // Verifico si el mensaje contiene una fecha y hora válidas
    if (!match) {
      return ctx.reply(
        '🗓️ Debes incluir una fecha válida. Ejemplo:\n/add Comprar pan - Recordatorio de compra - 22/04/2025 10:00'
      )
    }

    // Normalizo el formato de fecha si viene como DD/MM/YYYY HH:mm → MM/DD/YYYY HH:mm
    const normalized = rawDateTime.replace(
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})$/,
      '$2/$1/$3 $4'
    )

    const parsedDate = new Date(normalized)

    // Verifico que la fecha sea válida
    if (isNaN(parsedDate.getTime())) {
      return ctx.reply(
        '🕒 La fecha y hora no son válidas. Usa DD/MM/AAAA HH:mm o YYYY-MM-DD HH:mm'
      )
    }

    // Verifico que la fecha sea futura
    if (parsedDate < new Date()) {
      return ctx.reply(
        '⌚ La fecha y hora deben ser posteriores al momento actual.'
      )
    }

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Creo una nueva instancia del modelo Task
    const newTask = new Task({
      userId,
      name: taskName,
      description: taskDescription,
      reminderAt: parsedDate
    })

    // Guardo la tarea en la base de datos
    await newTask.save()

    // Envío mensaje de confirmación al usuario
    return ctx.reply(
      `🫡 Tarea registrada: "${taskName}"\n📅 Recordatorio: ${parsedDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}` +
        (taskDescription ? `\n📝 Descripción: ${taskDescription}` : '')
    )
  } catch (error) {
    if (error.code === 11000) {
      return ctx.reply(
        '🤯 Ya tienes una tarea con ese nombre. Por favor, elige otro nombre para la tarea.'
      )
    }

    console.error(`😵‍💫 Error al añadir tarea: ${error.message}`)
    return ctx.reply(
      '😵‍💫 Ha ocurrido un error inesperado. Inténtalo nuevamente.'
    )
  }
}
