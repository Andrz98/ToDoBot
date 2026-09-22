// src/controllers/startController/startController.js
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import {
  deleteNow,
  replyInterface
} from '../../utils/telegramUtils/messageLifecycle.js'
import {
  buildMainMenuKeyboard,
  buildCommandHelp
} from '../../helpers/menu/mainMenu.js'
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

    const tzMessage =
      userTimezone === 'Europe/Madrid'
        ? '🌐 Estás usando la zona horaria por defecto: <b>Europe/Madrid</b>.'
        : `🌐 Tu zona horaria actual es: <b>${userTimezone}</b>.`

    // Un único menú vivo: repetir /start sustituye al anterior
    await deleteNow(ctx, ctx.session?.startMessageId)
    const msg = await replyInterface(
      ctx,
      `🛡️ ¡Hola, ${escapeHtml(username)}!\n` +
        'TuttoFatto está listo para ayudarte.\n\n' +
        `${tzMessage}\n\n` +
        '¿Qué quieres hacer? Pulsa un botón o usa un comando:\n' +
        buildCommandHelp(),
      { parse_mode: 'HTML', ...buildMainMenuKeyboard() }
    )
    if (ctx.session) {
      ctx.session.startMessageId = msg?.message_id
    }
    return msg
  } catch (error) {
    console.error(`😵‍💫 Error en /start: ${error.message}`)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrieron problemas al procesar el comando. Inténtalo más tarde.',
      { parse_mode: 'HTML' }
    )
  }
}
