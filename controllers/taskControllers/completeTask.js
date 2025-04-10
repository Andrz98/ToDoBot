import { findUserTaskByName } from '@/helpers/userTaskBynameController/findUserTaskByName.js'

/**
 * Controlador para marcar una tarea como completada /done
 *
 * @param {object} ctx - Objeto de contexo proporcionado por telegraf
 */

export const completeTask = async (ctx) => {
  try {
    // Utilizo el helper que valida la autorización existente de la tarea
    const { error, task } = await findUserTaskByName(ctx)
    if (error) {
      return ctx.reply(error)
    }

    // Marco la tarea como completada
    task.completed = true
    await task.save()

    // Confirmo que la acción de completar la tarea fue exitosa
    return ctx.reply(
      `🫡 Ojitooo finalizaste la tarea "${task.name}", sigue así.`
    )
  } catch (error) {
    console.error(`😵‍💫 Error al completar la tarea: ${error.message}`)
    ctx.reply('😵‍💫 Ocurrio un error al completar la tarea. Intenta mas tarde.')
  }
}
