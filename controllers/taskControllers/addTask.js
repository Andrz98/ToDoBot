import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

/**
 * Controlador para agregar una tarea /add
 *
 * Formato obligatorio:
 * /add Nombre - [Descripción opcional] - Fecha
 *
 * Ejemplos válidos:
 * /add Comprar pan - - 20/09/25
 * /add Leer libro - Filosofía - 21/09/2025 08:00
 *
 * @param {object} ctx - Contexto del bot
 */
export const addTask = async (ctx) => {
  try {
    const userId = ctx.from.id

    // Verifico si el usuario esta autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    const input = ctx.message.text.replace(/^\/add\s*/, '').trim()
    const parts = input.split(' - ').map((p) => p.trim())

    if (parts.length < 2) {
      return ctx.reply(
        '🤯 Formato incorrecto. Usa:\n/add Nombre - [Descripción] - Fecha'
      )
    }

    const taskName = parts[0]
    const taskDescription = parts.length === 3 ? parts[1] : ''
    const rawDateTime = parts.length === 3 ? parts[2] : parts[1]

    // Validar que el nombre no esté vacío
    if (!taskName) {
      return ctx.reply('🤯 Debes proporcionar el nombre de la tarea.')
    }

    // Normalización completa y robusta de fechas
    const parsedDate = new Date(
      rawDateTime
        .replace(/^(\d{2})\/(\d{2})\/(\d{2})$/, '$1/$2/20$3 09:00')
        .replace(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})$/, '$1/$2/20$3 $4')
        .replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$1/$2/$3 09:00')
        .replace(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})$/, '$1/$2/$3 $4')
    )

    if (isNaN(parsedDate.getTime())) {
      return ctx.reply(
        '📆 La fecha no es válida. Usa el formato DD/MM/AAAA [HH:mm]'
      )
    }

    if (parsedDate < new Date()) {
      return ctx.reply('⌚ La fecha debe ser posterior a la actual.')
    }

    // Creo una nueva instancia del modelo task
    const newTask = new Task({
      userId,
      name: taskName,
      description: taskDescription,
      reminderAt: parsedDate
    })

    // Guardo la tarea en la base de datos
    await newTask.save()

    // Envío confirmación
    return ctx.reply(
      `<b>🫡 Tarea registrada:</b> "${taskName}"` +
        (taskDescription ? `\n<b>🔸 Descripción:</b> ${taskDescription}` : '') +
        `\n<b>📅 Recordatorio:</b> ${parsedDate.toLocaleString('es-ES', {
          dateStyle: 'full',
          timeStyle: 'short'
        })}`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al añadir tarea:', error)
    return ctx.reply('😵‍💫 Ocurrió un error al añadir la tarea.')
  }
}
