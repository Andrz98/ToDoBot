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
      'El/la Sin nombre'

    // Verifico si el usuario esta autorizado a usar el bot
    const authorized = await isUserAuthorized(ctx)
    const userTimezone = await getUserTimezone(ctx.from.id)
    const tzMessage =
      userTimezone === 'Europe/Madrid'
        ? '🌐 Actualmente estás usando la zona horaria por defecto: <b>Europe/Madrid</b>.\n'
        : `🌐 Tu zona horaria actual es: <b>${userTimezone}</b>\n`

    // Para la zona horaria la lógica es dinámica, si el user está en madrid, entonces le sugerimos cambiar a bogota y viceversa
    let suggestionMessage
    if (userTimezone === 'Europe/Madrid') {
      suggestionMessage =
        '🛫 Si quieres otro uso horario, usa:\n<b>/settimezone y pulsa la zona que te convenga'
    } else {
      suggestionMessage =
        '🛫 Si prefieres la zona por defecto, usa:\n<b>/settimezone Europe/Madrid</b>\n\n'
    }

    if (authorized) {
      return ctx.reply(
        `🛡️ ¡Hola, ${username}!\n` +
          'TuttoFatto está listo para ayudarte.\n\n' +
          tzMessage +
          suggestionMessage +
          'Los comandos disponibles son:\n' +
          '/settimezone - Cambiar tu zona horaria\n' +
          '/add - Añadir una nueva tarea\n' +
          '/list - Ver tus tareas activas\n' +
          '/done - Marcar una tarea como completada\n' +
          '/delete - Eliminar una tarea\n' +
          '/edit - Editar una tarea existente\n' +
          '/clear - Eliminar todas tus tareas\n',
        { parse_mode: 'HTML' }
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
