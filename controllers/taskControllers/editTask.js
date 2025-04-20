import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'
import { DateTime } from 'luxon'

/**
 * Controlador para editar una tarea /edit
 *
 * Formato obligatorio:
 * /edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]
 *
 * Ejemplos válidos:
 * /edit Comprar pan - - - 22/04/25 19:00
 * /edit Tarea vieja - Tarea nueva - - 23/04/2025 09:30
 *
 * Todos los campos excepto el nombre original son opcionales.
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */
export const editTask = async (ctx) => {
  try {
    // Validación del mensaje recibido
    if (!ctx.text || !ctx.from || !ctx.from.id) {
      return ctx.reply('🤯 Error interno: El mensaje recibido no es válido.')
    }

    const userId = ctx.from.id

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Elimino el comando /edit
    const content = ctx.text.replace(/^\/edit\s*/i, '').trim()

    // Separo el mensaje por líneas y limpio vacíos
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

    console.log('📋 LÍNEAS ENTRANTES:', lines)
    for (let i = lines.length - 1; i >= 0; i--) {
      const candidate = lines[i]
      console.log('🧪 Evaluando línea:', candidate)
      for (const format of dateFormats) {
        const luxonDate = DateTime.fromFormat(candidate, format, {
          zone: 'Europe/Madrid'
        })
        if (luxonDate.isValid) {
          parsedDate = luxonDate.toJSDate()
          dateLineIndex = i
          console.log(
            '✅ Fecha válida detectada:',
            candidate,
            '| Formato:',
            format,
            '| Index:',
            i
          )
          break
        }
      }
      if (parsedDate) {
        break
      }
    }

    console.log('📎 dateLineIndex:', dateLineIndex)
    // Separo nombre antiguo, nuevo nombre, nueva descripción
    const contentWithoutDate = lines.slice(0, dateLineIndex).join('\n').trim()
    console.log('📂 contentWithoutDate:', contentWithoutDate)
    // Fallback si no hay salto de línea y la fecha viene inline
    const fallback = dateLineIndex === 0 ? lines[0] : contentWithoutDate
    const campos = fallback.split(' - ').map((p) => p.trim())
    console.log('🧱 Campos detectados:', campos)

    if (!campos[0]) {
      return ctx.reply(
        '🤯 Formato incorrecto. Usa:\n/edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]'
      )
    }

    const [oldName, newName = '', newDescription = ''] = campos

    const task = await findTaskForController(userId, oldName)
    if (!task) {
      return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${oldName}"`)
    }

    let updated = false
    const responseParts = []

    if (
      newName &&
      newName !== task.name &&
      !newName.match(/^\d{2}\/\d{2}\/\d{2,4}/)
    ) {
      task.name = newName
      updated = true
      responseParts.push(`🔺 Nuevo nombre: ${newName}`)
    }

    if (
      newDescription &&
      newDescription !== task.description &&
      !newDescription.match(/^\d{2}\/\d{2}\/\d{2,4}/)
    ) {
      task.description = newDescription
      updated = true
      responseParts.push(`🔸 Descripción: ${newDescription}`)
    }

    // Valido y actualizo fecha si se incluyó
    if (parsedDate) {
      if (parsedDate < new Date()) {
        return ctx.reply('⌚ La nueva fecha debe ser futura.')
      }

      task.reminderAt = parsedDate
      updated = true
      responseParts.push(
        `🔹 Nueva fecha: ${parsedDate.toLocaleString('es-ES', {
          dateStyle: 'full',
          timeStyle: 'short'
        })}`
      )
    }

    if (!updated) {
      return ctx.reply('🤯 No se encontraron cambios en la tarea.')
    }

    await task.save()

    return ctx.reply(
      '<b>✏️ Tarea actualizada correctamente:</b>\n' + responseParts.join('\n'),
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('😵‍💫 Error al editar tarea:', error)
    console.error(
      '😵‍💫 Error completo:',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    )
    return ctx.reply('😵‍💫 Ocurrió un error al intentar editar tu tarea.')
  }
}
