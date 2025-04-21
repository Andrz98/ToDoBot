import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'
import { parseEditCommand } from '../../helpers/edit/parseEditCommand.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'
import { replyMessages } from '../../helpers/edit/replyMessages.js'

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
 * @returns {Promise<object>} - Promesa con la respuesta enviada al usuario
 */
export const editTask = async (ctx) => {
  try {
    // Validación básica del contexto
    if (!ctx.text || !ctx.from?.id) {
      return replyMessages.invalidInput(ctx)
    }

    // Verificación de autorización
    const userId = ctx.from.id
    if (!(await isUserAuthorized(ctx))) {
      return replyMessages.unauthorized(ctx)
    }

    // Parseo del comando de edición
    const parsed = parseEditCommand(ctx.text)
    if (!parsed.isValid) {
      return replyMessages.formatHelp(ctx)
    }

    // Validación de longitud del nombre
    if (parsed.newName && parsed.newName.length > 100) {
      return replyMessages.nameTooLong(ctx)
    }

    // Búsqueda de la tarea existente
    const task = await findTaskForController(userId, parsed.oldName)
    if (!task) {
      return replyMessages.taskNotFound(ctx, parsed.oldName)
    }

    // Actualización de los campos de la tarea
    const { updated, changes } = updateTaskFields(task, parsed)
    if (!updated) {
      return replyMessages.noChanges(ctx)
    }

    // Guardado de la tarea actualizada
    await task.save()

    // Respuesta exitosa
    return replyMessages.success(ctx, changes)
  } catch (err) {
    // Manejo de errores específicos
    if (err.message === 'PAST_DATE') {
      return replyMessages.pastDate(ctx)
    }
    if (err.message === 'EMPTY_NAME') {
      return replyMessages.emptyName(ctx)
    }
    if (err.message === 'INVALID_DATE_FORMAT') {
      return replyMessages.invalidDateFormat(ctx)
    }

    // Log y respuesta para errores generales
    console.error('😵‍💫 Error al editar tarea:', err)
    return replyMessages.generalError(ctx)
  }
}
