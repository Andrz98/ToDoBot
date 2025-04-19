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
    if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.from.id) {
      return ctx.reply('🤯 Error interno: El mensaje recibido no es válido.')
    }

    const userId = ctx.from.id

    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    const input = ctx.message.text.replace(/^\/edit\s*/, '').trim()
    const parts = input.split(' - ').map((p) => p.trim())

    if (parts.length < 2) {
      return ctx.reply(
        '🤯 Formato incorrecto. Usa:\n/edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]'
      )
    }

    const oldName = parts[0]
    const newName = parts[1] || ''
    const newDescription = parts[2] || ''
    const rawDateTime = parts[3] || ''

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

    // Parseo con Luxon
    let parsedDate
    if (rawDateTime) {
      const dateFormats = [
        'dd/MM/yy HH:mm',
        'dd/MM/yyyy HH:mm',
        'dd/MM/yy',
        'dd/MM/yyyy'
      ]

      for (const format of dateFormats) {
        const luxonDate = DateTime.fromFormat(rawDateTime, format, {
          zone: 'Europe/Madrid'
        })
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
