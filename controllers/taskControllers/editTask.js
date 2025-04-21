import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'
import { parseEditCommand } from '../../helpers/edit/parseEditCommand.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'

export const editTask = async (ctx) => {
  try {
    if (!ctx.text || !ctx.from?.id) {
      return ctx.reply('🤯 El mensaje recibido no es válido.')
    }

    const userId = ctx.from.id
    if (!(await isUserAuthorized(ctx))) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }

    const parsed = parseEditCommand(ctx.text)
    if (!parsed.isValid) {
      return ctx.reply(
        '🧾 Formato correcto:\n/edit NombreAntiguo - [NuevoNombre] - [NuevaDescripción] - [NuevaFecha]',
        { parse_mode: 'HTML' }
      )
    }

    const task = await findTaskForController(userId, parsed.oldName)
    if (!task) {
      return ctx.reply(
        `🤯 No se encontró ninguna tarea llamada "${parsed.oldName}"`
      )
    }

    const { updated, changes } = updateTaskFields(task, parsed)
    if (!updated) {
      return ctx.reply('🤯 No se encontraron cambios en la tarea.')
    }

    await task.save()

    return ctx.reply('<b>✏️ Tarea actualizada:</b>\n' + changes.join('\n'), {
      parse_mode: 'HTML'
    })
  } catch (err) {
    if (err.message === 'PAST_DATE') {
      return ctx.reply('⌚ La nueva fecha debe ser futura.')
    }
    console.error('😵‍💫 Error al editar tarea:', err)
    return ctx.reply('😵‍💫 Ocurrió un error al editar la tarea.')
  }
}
