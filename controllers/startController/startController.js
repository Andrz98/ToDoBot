// src/controllers/startController/startController.js
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import { UNAUTHORIZED_TEXT } from '../../helpers/replyMessages/genericReplyMessages.js'

/**
 * Comando /start - Este es el punto de inicio del bot
 *
 * @param {object} ctx - Contexto del bot
 */
export const startCommand = async (ctx) => {
  debugLog('🟢 [DEBUG] /start')
  try {
    const username =
      ctx.from?.username ||
      ctx.from?.first_name ||
      ctx.from?.last_name ||
      'El/la Sin nombre'

    // Verifico si el usuario está autorizado ANTES de tocar cualquier dato
    // que exija que exista un AuthorizedUser (getUserTimezone lanza si no existe)
    const authorized = await isUserAuthorized(ctx)

    if (!authorized) {
      return safeReply(
        ctx,
        `${UNAUTHORIZED_TEXT}\n` +
          'Solicita acceso a @tuttofatto_bot para que te añada como usuario.\n' +
          'Nuestra base de datos es limitada, por lo tanto no podemos permitir el acceso de todos los usuarios que nos lo soliciten.',
        { parse_mode: 'HTML' }
      )
    }

    const userTimezone = await getUserTimezone(ctx.from.id)

    // Mensaje de zona horaria actual
    const tzMessage =
      userTimezone === 'Europe/Madrid'
        ? '🌐 Actualmente estás usando la zona horaria por defecto: <b>Europe/Madrid</b>.\n\n'
        : `🌐 Tu zona horaria actual es: <b>${userTimezone}</b>\n\n`

    // Sugerencia para cambiar de zona, con cierre de etiqueta </b>
    let suggestionMessage
    if (userTimezone === 'Europe/Madrid') {
      suggestionMessage =
        '🛫 Si quieres otro huso horario, usa: <b>/settimezone</b> y pulsa la zona que te convenga.\n\n'
    } else {
      suggestionMessage =
        '🛫 Si prefieres la zona por defecto, usa: <b>/settimezone Europe/Madrid</b>\n\n'
    }

    return safeReply(
      ctx,
      `🛡️ ¡Hola, ${escapeHtml(username)}!\n` +
        'TuttoFatto está listo para ayudarte.\n\n' +
        tzMessage +
        suggestionMessage +
        'Estos son los comandos disponibles:\n' +
        '/settimezone - Cambiar zona horaria\n' +
        '/add         - Añadir nueva tarea\n' +
        '/list        - Ver tareas activas\n' +
        '/done        - Marcar tarea como completada\n' +
        '/delete      - Eliminar tarea\n' +
        '/edit        - Editar tarea existente\n' +
        '/clear       - Eliminar tareas completadas\n',
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error(`😵‍💫 Error en /start: ${error.message}`)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrieron problemas al procesar el comando. Inténtalo más tarde.',
      { parse_mode: 'HTML' }
    )
  }
}
