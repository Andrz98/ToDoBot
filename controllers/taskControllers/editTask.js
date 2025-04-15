import { findUserTaskByName } from '../../helpers/userTaskBynameController/findUserTaskByName.js'

/**
 * Controlador para editar la descripción de una tarea existente /edit
 *
 * @param {object} ctx - Objeto de contexto proporcionado por telegraf
 */

export const editTask = async (ctx) => {
  try {
    // Extraigo el contenido completo del mensaje (después del comando)
    const input = ctx.message.text.split(' ').slice(1).join(' ').trim()

    // Verifico que el mensaje contenga el guion separador
    if (!input.includes('-')) {
      return ctx.reply(
        '🤯 Debes proporcionar una descripción de la tarea. Ejemplo:\n/edit Comprar pan - En la panadería nueva'
      )
    }

    // Separo el nombre de la descripción por el primer guión encontrado
    const [nameRaw, ...descParts] = input.split('-')
    const taskName = nameRaw.trim()
    const newDescription = descParts.join('-').trim()

    // Valido que ambas estén presentes
    if (!taskName || !newDescription) {
      return ctx.reply(
        '🤯 Asegúrate de incluir tanto el nombre como la nueva descripción. Ejemplo:\n/edit Comprar pan - En la panadería nueva'
      )
    }

    // Simulo el mensaje como si fuera /delete <name>, para usar el helper
    ctx.message.text = `/edit ${taskName}`
    const { error, task } = await findUserTaskByName(ctx)
    if (error) {
      return ctx.reply(error)
    }

    // Actualizo la tarea con la nueva descripción
    task.description = newDescription
    await task.save()

    // Confirmo que la acción de editar la tarea fue exitosa
    return ctx.reply(
      `🫡 Venga va, has actualizado la descripción de "${task.name}". Ahora dice:\n"${task.description}"`
    )
  } catch (error) {
    console.error(`😵‍💫 Error al editar la tarea: ${error.message}`)
    ctx.reply('😵‍💫 Ocurrió un error al editar la tarea. Intenta más tarde.')
  }
}
