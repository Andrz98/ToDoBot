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

    // Verifico si el mensaje contiene el formato correcto
    const rawText = ctx.text
    if (!rawText) {
      return ctx.reply(
        '🤯 No se pudo procesar tu mensaje. Asegúrate de que sea texto plano.'
      )
    }

    // Elimino el comando /add del contenido
    const content = rawText.replace(/^\/add\s*/i, '').trim()

    // Separo el mensaje en líneas y filtro vacías
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')

    // ===============================
    // Parseo de fecha con LUXON
    // ===============================
    const dateFormats = [
      'dd/MM/yy HH:mm',
      'dd/MM/yyyy HH:mm',
      'dd/MM/yy',
      'dd/MM/yyyy'
    ]
    let parsedDate = null
    let dateLineIndex = -1

    console.log('📋 TODAS LAS LÍNEAS:', lines)
    for (let i = lines.length - 1; i >= 0; i--) {
      const original = lines[i]
      const candidate = original.replace(/^[-\s]+/, '') // <-- Sanear la línea de entrada
      console.log('🧪 LINEA EVALUADA:', candidate)

      for (const format of dateFormats) {
        const luxonDate = DateTime.fromFormat(candidate, format, {
          zone: 'Europe/Madrid'
        })

        if (luxonDate.isValid) {
          parsedDate = luxonDate.toJSDate()
          dateLineIndex = i
          console.log('✅ FECHA DETECTADA:', candidate)
          break
        }
      }

      if (parsedDate) {
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

    // Extraigo título y descripción
    const contentWithoutDate = lines.slice(0, dateLineIndex).join('\n').trim()
    const [taskName, ...descriptionLines] = contentWithoutDate.split(' - ')
    const taskDescription = descriptionLines.join(' - ').trim()

    if (!taskName || taskName.length < 2) {
      return ctx.reply('🤯 Debes proporcionar el nombre de la tarea.')
    }

    // Creo una nueva instancia del modelo task
    const newTask = new Task({
      userId,
      name: taskName.trim(),
      description: taskDescription,
      reminderAt: parsedDate
    })

    await newTask.save()

    // Envío confirmación
    return ctx.reply(
      `<b>🫡 Tarea registrada:</b> "${taskName.trim()}"` +
        (taskDescription ? `\n<b>🔸 Descripción:</b> ${taskDescription}` : '') +
        `\n<b>📅 Recordatorio:</b> ${DateTime.fromJSDate(parsedDate, {
          zone: 'Europe/Madrid'
        }).toLocaleString(DateTime.DATETIME_FULL)}`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    if (error.code === 11000) {
      return ctx.reply(
        '🤯 Ya existe una tarea con ese nombre. Por favor elige otro nombre.'
      )
    }
    console.error('😵‍💫 Error al añadir tarea:', error)
    return ctx.reply('😵‍💫 Ocurrió un error al añadir la tarea.')
  }
}
