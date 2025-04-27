import { safeReply } from '../../utils/retryUtils/safeReply.js'

/**
 * Comando /ping - Respuesta rápida sin restricciones
 *
 * @param {object} ctx - Contexto del bot
 */
export const pingCommand = async (ctx) => {
  try {
    return safeReply(ctx, '🏓 Pong! El bot está funcionando.')
  } catch (error) {
    console.error('❌ Error en /ping:', error.message)
    return safeReply(ctx, '😵 Error inesperado al procesar /ping.')
  }
}
