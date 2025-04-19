import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findUserTaskByName } from '../../helpers/userTaskBynameController/findUserTaskByName.js'

/**
 * Controlador para editar una tarea /edit
 *
 * Formato aceptado:
 * /edit Antigua tarea - Nueva tarea - Nueva descripción - Nueva fecha
 *
 * Todos los campos excepto el nombre original son opcionales.
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */

export const editTask = async (ctx) => {
  try {
    // Extraigo el ID del usuario
    const userId = ctx.from.id

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Extraigo el mensaje después del comando /edit
    const input = ctx.message.text.replace(/^\/edit\s*/, '').trim()
    const parts = input.split(' - ')

    // Verifico si el mensaje contiene al menos el nombre original y un campo editable
    if (parts.length < 2) {
      return ctx.reply(
        '🤯 Formato incorrecto. Usa:\n/edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]'
      )
    }

    const oldName = parts[0].trim()
    const newName = parts[1]?.trim()
    const newDescription = parts[2]?.trim()
    const rawDateTime = parts[3]?.trim()

    // Busco la tarea por userId y nombre
    const task = await findUserTaskByName(userId, oldName)
    if (!task) {
      return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${oldName}"`)
    }

    // Verifico y aplico los cambios solicitados
    let updated = false
    const responseParts = []

    // Actualizo el nombre si fue proporcionado
    if (newName) {
      task.name = newName
      updated = true
      responseParts.push(`🆕 Nuevo nombre: ${newName}`)
    }

    // Actualizo la descripción si fue proporcionada
    if (newDescription) {
      task.description = newDescription
      updated = true
      responseParts.push(`📝 Descripción: ${newDescription}`)
    }

    // Actualizo la fecha si fue proporcionada
    if (rawDateTime) {
      const normalized = rawDateTime.replace(
        /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})$/,
        '$2/$1/$3 $4'
      )
      const parsedDate = new Date(normalized)

      if (isNaN(parsedDate.getTime())) {
        return ctx.reply(
          '📆 La fecha no es válida. Usa el formato DD/MM/AAAA HH:mm.'
        )
      }

      if (parsedDate < new Date()) {
        return ctx.reply('⌚ La nueva fecha debe ser futura.')
      }

      task.reminderAt = parsedDate
      updated = true
      responseParts.push(
        `📅 Nueva fecha: ${parsedDate.toLocaleString('es-ES', {
          dateStyle: 'full',
          timeStyle: 'short'
        })}`
      )
    }

    // Verifico si hubo algún cambio válido
    if (!updated) {
      return ctx.reply('🤯 No se encontraron cambios en la tarea.')
    }

    // Guardo los cambios en la base de datos
    await task.save()

    // Respondo al usuario con la confirmación de los cambios
    return ctx.reply(
      '✏️ Tarea actualizada correctamente:\n' + responseParts.join('\n')
    )
  } catch (error) {
    console.error(`😵‍💫 Error al editar tarea: ${error.message}`)
    return ctx.reply('😵‍💫 Ocurrió un error al intentar editar tu tarea.')
  }
}
