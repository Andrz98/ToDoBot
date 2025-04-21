import { Task } from '../../models/task.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { DateTime } from 'luxon'

/**
 * Controlador para agregar una tarea /add
 *
 * Formato obligatorio:
 * /add Nombre - [Descripción compleja opcional] - Fecha
 *
 * Ejemplos válidos:
 * /add Comprar pan - - 20/09/25
 * /add Leer libro - Filosofía - 21/09/2025 08:00
 * /add Reunión importante - Puntos a tratar:
 * 1. Presupuesto
 * 2. Plan estratégico
 * * Proyectos en curso
 * * Nuevas iniciativas - 25/04/2025 15:30
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

    // Validación específica para cuando el usuario solo envía el comando sin parámetros
    if (!content || content === ':') {
      return ctx.reply(
        '🧾 <b>Formato correcto:</b>\n/add Nombre - [Descripción opcional] - Fecha\n\n<b>Ejemplos:</b>\n/add Comprar pan - - 20/09/25\n/add Leer libro - Filosofía - 21/09/2025 08:00',
        { parse_mode: 'HTML' }
      )
    }

    // ===============================
    // Parseo de fecha primero
    // ===============================
    const dateFormats = [
      'dd/MM/yy HH:mm',
      'dd/MM/yyyy HH:mm',
      'dd/MM/yy',
      'dd/MM/yyyy'
    ]

    // Regex para detectar fechas en formato DD/MM/YYYY [HH:MM]
    const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\s+(\d{1,2}:\d{1,2}))?/

    // Buscar la última ocurrencia que coincida con el patrón de fecha
    let dateMatch = null

    // Buscar la última aparición de una fecha válida en el contenido
    const contentParts = content.split(/\s+/)
    for (let i = contentParts.length - 1; i >= 0; i--) {
      const part = contentParts[i]
      if (dateRegex.test(part)) {
        // Intentar extraer la fecha y posiblemente la hora de las siguientes partes
        let dateStr = part
        // Si hay una parte siguiente y se parece a una hora (HH:MM), añadirla
        if (
          i + 1 < contentParts.length &&
          /^\d{1,2}:\d{1,2}$/.test(contentParts[i + 1])
        ) {
          dateStr += ' ' + contentParts[i + 1]
        }

        // Intentar parsear la fecha con los formatos disponibles
        for (const format of dateFormats) {
          const luxonDate = DateTime.fromFormat(dateStr, format, {
            zone: 'Europe/Madrid'
          })

          if (luxonDate.isValid) {
            dateMatch = {
              originalText: dateStr,
              date: luxonDate.toJSDate(),
              index: i
            }
            console.log('✅ FECHA DETECTADA:', dateStr, 'con formato:', format)
            break
          }
        }

        if (dateMatch) {
          break
        }
      }
    }

    // Si no se encontró una fecha válida, buscar un patrón más explícito como "Fecha: DD/MM/YYYY"
    if (!dateMatch) {
      const explicitDateRegex =
        /(?:🔹\s*)?(?:Fecha|fecha):\s*([^,]+,\s*\d{1,2}\s+de\s+[^\d,]+\s+de\s+\d{4}(?:,\s*\d{1,2}:\d{1,2})?)/i
      const explicitMatch = content.match(explicitDateRegex)

      if (explicitMatch) {
        const dateText = explicitMatch[1].trim()
        // Intentar convertir el formato de fecha humanizado a algo que Luxon pueda entender
        const parsedDate = parseHumanDate(dateText)
        if (parsedDate) {
          dateMatch = {
            originalText: dateText,
            date: parsedDate,
            index: content.indexOf(explicitMatch[0])
          }
          console.log('✅ FECHA HUMANIZADA DETECTADA:', dateText)
        }
      }
    }

    if (!dateMatch) {
      return ctx.reply(
        '📆 No se pudo detectar una fecha válida. Usa el formato DD/MM/AAAA [HH:MM] o "Fecha: [descripción de fecha]"'
      )
    }

    if (dateMatch.date < new Date()) {
      return ctx.reply('⌚ La fecha debe ser posterior a la actual.')
    }

    // ===============================
    // Extraer nombre y descripción
    // ===============================
    // Primero eliminamos la parte de la fecha del contenido original
    let contentWithoutDate = content

    // Si encontramos una fecha en formato DD/MM/YYYY
    if (dateRegex.test(dateMatch.originalText)) {
      // Reemplazar la última aparición de la fecha
      const dateIndex = content.lastIndexOf(dateMatch.originalText)
      if (dateIndex !== -1) {
        contentWithoutDate = content.substring(0, dateIndex).trim()
      }
    } else {
      // Si es una fecha humanizada, eliminamos toda la parte "Fecha: ..."
      const dateMarker = content.match(/(?:🔹\s*)?(?:Fecha|fecha):/i)
      if (dateMarker) {
        contentWithoutDate = content.substring(0, dateMarker.index).trim()
      }
    }

    // Ahora extraemos el nombre y la descripción
    // El nombre será la parte antes del primer guión
    const firstDashIndex = contentWithoutDate.indexOf(' - ')

    let taskName
    let taskDescription = ''

    if (firstDashIndex !== -1) {
      taskName = contentWithoutDate.substring(0, firstDashIndex).trim()
      taskDescription = contentWithoutDate.substring(firstDashIndex + 3).trim()
    } else {
      // Si no hay guión, todo es el nombre
      taskName = contentWithoutDate.trim()
    }

    if (!taskName || taskName.length < 2) {
      return ctx.reply('🤯 Debes proporcionar el nombre de la tarea.')
    }

    // Creo una nueva instancia del modelo task
    const newTask = new Task({
      userId,
      name: taskName,
      description: taskDescription,
      reminderAt: dateMatch.date
    })

    await newTask.save()

    // Configuración para formato de 24 horas con ceros a la izquierda
    const dateTimeOptions = {
      ...DateTime.DATETIME_FULL,
      hour12: false,
      hourCycle: 'h23' // Asegura el formato 00-23 para las horas
    }

    // Envío confirmación
    return ctx.reply(
      `<b>🫡 Tarea registrada:</b> "${taskName}"` +
        (taskDescription ? `\n<b>🔸 Descripción:</b> ${taskDescription}` : '') +
        `\n<b>📅 Recordatorio:</b> ${DateTime.fromJSDate(dateMatch.date, {
          zone: 'Europe/Madrid'
        }).toLocaleString(dateTimeOptions)}`,
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

/**
 * Función auxiliar para convertir fechas en formato humanizado
 * a objetos Date de JavaScript
 *
 * @param {string} humanDate - Fecha en formato humanizado (ej: "jueves, 24 de abril de 2025, 22:00")
 * @returns {Date|null} - Objeto Date o null si no se pudo parsear
 */
function parseHumanDate(humanDate) {
  try {
    // Mapeo de nombres de meses en español a números
    const monthNames = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12
    }

    // Expresión regular para extraer día, mes, año y hora (opcional)
    const regex =
      /(?:.*?,\s*)?(\d{1,2})\s+de\s+([^\d,]+)\s+de\s+(\d{4})(?:,\s*(\d{1,2}):(\d{1,2}))?/i
    const match = humanDate.match(regex)

    if (match) {
      const day = parseInt(match[1], 10)
      const monthName = match[2].toLowerCase()
      const year = parseInt(match[3], 10)
      const hour = match[4] ? parseInt(match[4], 10) : 0
      const minute = match[5] ? parseInt(match[5], 10) : 0

      if (monthNames[monthName]) {
        const month = monthNames[monthName]
        // Crear fecha (los meses en JavaScript van de 0-11)
        return new Date(year, month - 1, day, hour, minute)
      }
    }

    return null
  } catch (error) {
    console.error('Error parseando fecha humanizada:', error)
    return null
  }
}
