import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'

/**
 * Controlador para editar una tarea /edit
 *
 * Formato aceptado:
 * /edit Antigua tarea - Nueva tarea - Nueva descripción - Nueva fecha
 * /edit Antigua tarea 22/04/25 13:00
 *
 * Todos los campos excepto el nombre original son opcionales.
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */

export const editTask = async (ctx) => {
  try {
    // Validación del contexto
    if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.from.id) {
      return ctx.reply('🤯 Error interno: El mensaje recibido no es válido.')
    }

    // Extraigo el ID del usuario
    const userId = ctx.from.id

    // Verifico si el usuario está autorizado a usar el bot
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    // Extraigo el mensaje después del comando /edit
    const input = ctx.message.text.replace(/^\/edit\s*/, '').trim()
    let oldName = ''
    let newName = ''
    let newDescription = ''
    let rawDateTime = ''

    if (input.includes(' - ')) {
      // Formato con guiones (más estructurado)
      const parts = input.split(' - ').map((p) => p.trim())

      if (parts.length < 2) {
        return ctx.reply(
          '🤯 Formato incorrecto. Usa:\n/edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]'
        )
      }

      oldName = parts[0]
      newName = parts[1] || ''
      newDescription = parts[2] || ''
      rawDateTime = parts[3] || ''
    } else {
      // Formato flexible sin guiones
      const tokens = input.split(' ')
      const possibleDate = tokens.slice(-2).join(' ')
      const dateRegex =
        /^\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}$|^\d{2}\/\d{2}\/\d{2,4}$/

      if (dateRegex.test(possibleDate)) {
        rawDateTime = possibleDate
        oldName = tokens.slice(0, -2).join(' ')
      } else {
        return ctx.reply(
          '🤯 Formato incorrecto. Usa:\n/edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]'
        )
      }
    }

    // Busco la tarea por userId y nombre
    const task = await findTaskForController(userId, oldName)
    if (!task) {
      return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${oldName}"`)
    }

    // Verifico y aplico los cambios solicitados
    let updated = false
    const responseParts = []

    // Actualizo el nombre si fue proporcionado
    if (
      newName &&
      newName !== task.name &&
      !newName.match(/^\d{2}\/\d{2}\/\d{4}/)
    ) {
      task.name = newName
      updated = true
      responseParts.push(`🆕 Nuevo nombre: ${newName}`)
    }

    // Actualizo la descripción si fue proporcionada
    if (
      newDescription &&
      newDescription !== task.description &&
      !newDescription.match(/^\d{2}\/\d{2}\/\d{4}/)
    ) {
      task.description = newDescription
      updated = true
      responseParts.push(`📝 Descripción: ${newDescription}`)
    }

    // === BLOQUE CORREGIDO PARA FECHAS ===
    if (/^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}$/.test(rawDateTime)) {
      rawDateTime = rawDateTime.replace(
        /^(\d{2})\/(\d{2})\/(\d{2})/,
        (match, d, m, y) => `${d}/${m}/20${y}`
      )
    }

    if (
      rawDateTime &&
      rawDateTime.match(
        /\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}|\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/
      )
    ) {
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
