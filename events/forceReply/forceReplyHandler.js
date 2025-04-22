// events/forceReplyHandler.js
import { bot } from '../../config/telegraf/telegraf.js'
import Task from '../models/task.js'
import { updateTaskFields } from '../helpers/edit/updateTaskFields.js'
import { detectAndParseDate } from '../helpers/date/detectAndParseDate.js'
import { replyMessages } from '../helpers/edit/replyMessages.js'

/**
 * Maneja las respuestas forzadas tras pulsar un botón de edición.
 * Lee ctx.session.awaiting y ctx.session.editing para saber qué editar.
 */
bot.on('message', async (ctx) => {
  const awaiting = ctx.session.awaiting
  const editing = ctx.session.editing
  if (!awaiting || !editing) {
    return
  }

  try {
    // 1. Obtener la tarea por ID para evitar datos obsoletos
    const task = await Task.findById(editing.id)
    if (!task) {
      ctx.session.awaiting = null
      ctx.session.editing = null
      return replyMessages.taskNotFound(ctx, editing.oldName)
    }

    // 2. Preparar el campo a actualizar según lo que esperábamos
    const text = ctx.message.text.trim()
    const fields = {}

    if (awaiting === 'new_name') {
      fields.newName = text
    } else if (awaiting === 'new_desc') {
      fields.newDescription = text
    } else if (awaiting === 'new_date') {
      const { date } = detectAndParseDate([text])
      if (!date) {
        return replyMessages.invalidDateFormat(ctx)
      }
      fields.date = date
    }

    // 3. Aplicar cambios y validar
    const { updated, changes } = updateTaskFields(task, fields)
    if (!updated) {
      return replyMessages.noChanges(ctx)
    }

    // 4. Guardar en BD y limpiar sesión
    await task.save()
    ctx.session.awaiting = null
    ctx.session.editing = null

    // 5. Confirmar éxito al usuario
    return replyMessages.success(ctx, changes)
  } catch (error) {
    console.error('😵‍💫 Error en forceReplyHandler:', error)
    ctx.session.awaiting = null
    ctx.session.editing = null
    return replyMessages.generalError(ctx)
  }
})
