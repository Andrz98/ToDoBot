import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { getUserTimezone } from '../../helpers/userTimezone/getUserTimezone.js'

/**
 * Comando /start - Este es el punto de inicio del bot
 *
 * @param {object} ctx - Contexto del bot
 */
export const startCommand = async (ctx) => {
  console.log('ctx.from:', ctx.from)
  try {
    const username =
      ctx.from?.username ||
      ctx.from?.first_name ||
      ctx.from?.last_name ||
      'Pat Oso 🐶 Pat Osa'

    // Verifico si el usuario esta autorizado a usar el bot
    const authorized = await isUserAuthorized(ctx)
    const userTimezone = await getUserTimezone(ctx.from.id)
    const tzMessage =
      userTimezone === 'Europe/Madrid'
        ? '🌐 Actualmente estás usando la zona horaria por defecto: Europe/Madrid.\n'
        : `🌎 Tu zona horaria actual es: ${userTimezone}\n`

    const suggestionMessage =
      userTimezone === 'Europe/Madrid'
        ? '🛫 Puedes cambiarla con:\n/settimezone America/Bogota\n\n'
        : ''

    if (authorized) {
      return ctx.reply(
        `🫡 ¡Hola, ${username}!\n` +
          'TuttoFatto está listo para ayudarte.\n\n' +
          tzMessage +
          suggestionMessage +
          'Los comandos disponibles son:\n' +
          '/add - Añadir una nueva tarea\n' +
          '/list - Ver tus tareas activas\n' +
          '/done - Marcar una tarea como completada\n' +
          '/delete - Eliminar una tarea\n' +
          '/edit - Editar una tarea existente\n' +
          '/clear - Eliminar todas tus tareas\n'
      )
    }

    // En caso de que no este autorizado, entonces mostramos un mensaje informativo
    return ctx.reply(
      '🤨 No estás autorizad@ para usar este bot.\n' +
        'Solicita acceso a @tuttofatto_bot para que te añada como usuario.\n' +
        'Nuestra base de datos es limitada, por lo tanto no podemos permitir el acceso de todos los usuarios que nos lo soliciten.'
    )
  } catch (error) {
    console.error(`😵‍💫 Error en /start: ${error.message}`)
    return ctx.reply(
      '😵 Ocurrieron problemas al procesar el comando. Intentalo más tarde.'
    )
  }
}
