import { isAuthorizedUser } from '@/middlewares/access/isAuthorizedUser'

/**
 * Comando /start - Este es el punto de inicio del bot
 *
 * @param {object} ctx - Contexto del bot
 */
export const startCommand = async (ctx) => {
  try {
    const username = ctx.from.username || 'username'

    // Verifico si el usuario esta autorizado a usar el bot
    const authorized = await isAuthorizedUser(ctx)

    if (authorized) {
      return ctx.reply(
        `🫡 ¡Hola, ${username}!\n` +
          'TuttoFatto está listo para ayudarte.\n\n' +
          'Estos son algunos comandos que puedes usar:\n' +
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
      '😵 Ocurrieron problems al procesar el comando. Intentalo más tarde.'
    )
  }
}
