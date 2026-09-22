import { debugLog } from '../logUtils/debugLog.js'

/**
 * Borra un mensaje de Telegram sin romper el flujo si ya no existe,
 * ya fue borrado, o Telegram rechaza el borrado (mensaje demasiado viejo, etc.).
 */
export async function safeDeleteMessage(ctx, chatId, messageId) {
  if (!messageId) {
    return
  }
  try {
    await ctx.telegram.deleteMessage(chatId, messageId)
  } catch (error) {
    debugLog('🗑️ [safeDeleteMessage] No se pudo borrar:', error?.message)
  }
}
