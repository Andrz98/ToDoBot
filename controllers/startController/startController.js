// src/controllers/startController/startController.js
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { sendMainMenu } from '../../helpers/menu/mainMenu.js'
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

    // Un único menú vivo: repetir /start sustituye al anterior
    return await sendMainMenu(ctx)
  } catch (error) {
    console.error(`😵‍💫 Error en /start: ${error.message}`)
    return safeReply(
      ctx,
      '😵‍💫 Ocurrieron problemas al procesar el comando. Inténtalo más tarde.',
      { parse_mode: 'HTML' }
    )
  }
}
