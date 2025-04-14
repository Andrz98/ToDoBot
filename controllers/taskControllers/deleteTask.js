import { findUserTaskByName } from '@/helpers/userTaskBynameController/findUserTaskByName.js'

/**
 * Controlador para eliminar una tarea específica /delete
 *
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const deleteTask = async (ctx) => {
  try {
    // Utilizo el helper que valida la autorización existente de la tarea
    const { error, task } = await findUserTaskByName(ctx)
    if (error) {
      return ctx.reply(error)
    }

    // Elimino la tarea si fue encontrada
    await task.deleteOne()

    // Confirmo que la acción de eliminar la tarea fue exitosa
    return ctx.reply(
      `🫡 Ojitooo eliminaste la tarea "${task.name}". Ten cuidado y no la líes`
    )
  } catch (error) {
    console.error(`😵‍💫 Error al eliminar la tarea: ${error.message}`)
    ctx.reply('😵‍💫 Ocurrio un error al eliminar la tarea. Intenta más tarde.')
  }
}
