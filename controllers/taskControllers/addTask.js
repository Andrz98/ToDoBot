import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { DateTime } from 'luxon'

/**
 * Controlador para agregar una tarea /add
 *
 * Formato obligatorio:
 * /add Nombre - [Descripción opcional] - Fecha
 *
 * Ejemplos válidos:
 * /add Comprar pan - - 20/09/25
 * /add Leer libro - Filosofía - 21/09/2025 08:
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
    const rawDateTime = (parts.length === 3 ? parts[2] : parts[1])
      .replace(/\s+/g, ' ')
      .trim()

    if (!taskName) {
      return ctx.reply('🤯 Debes proporcionar el nombre de la tarea.')
    }

    // ===============================
    // Parseo de fecha con LUXON
    // ===============================
    console.log(`📩 rawDateTime recibido: [${rawDateTime}]`)
    const dateFormats = [
      'dd/MM/yy HH:mm',
      'dd/MM/yyyy HH:mm',
      'dd/MM/yy',
      'dd/MM/yyyy'
    ]
    let parsedDate

    for (const format of dateFormats) {
      const luxonDate = DateTime.fromFormat(rawDateTime, format, {
        zone: 'Europe/Madrid'
      })
      console.log(
        `🧪 Probando formato: ${format} → ${luxonDate.isValid ? '✅ válido' : '❌ inválido'}`
      )
      if (luxonDate.isValid) {
        parsedDate = luxonDate.toJSDate()
        break
      }
    }

    if (!parsedDate) {
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
