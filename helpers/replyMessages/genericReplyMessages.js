// Textos canónicos reutilizados en varios flujos, para no mantener copias
// divergentes del mismo concepto en cada archivo.
// (antes había 3 variantes de emoji/texto distintas solo para "no autorizado")
export const UNAUTHORIZED_TEXT = '🥸 Debes estar autorizado para usar este bot.'
export const GENERAL_ERROR_TEXT =
  '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.'
export const OPERATION_CANCELLED_TEXT = 'Operación cancelada.'
export const CLEAR_DONE_TEXT = '✅ Tareas eliminadas.'

/**
 * Colección de funciones para manejar respuestas comunes al usuario
 */
export const replyMessages = {
  /**
   * Responde cuando el mensaje recibido no es válido
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  invalidInput: (ctx) => ctx.reply('🤯 El mensaje recibido no es válido.'),

  /**
   * Responde cuando el usuario no está autorizado
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  unauthorized: (ctx) => ctx.reply(UNAUTHORIZED_TEXT),

  /**
   * Muestra ayuda sobre el formato del comando
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */

  /**
   * Responde cuando no se encuentra la tarea
   * @param {object} ctx - Contexto de Telegraf
   * @param {string} name - Nombre de la tarea no encontrada
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  taskNotFound: (ctx, name) =>
    ctx.reply(`🤯 No se encontró ninguna tarea llamada "${name}"`),

  /**
   * Responde cuando se intenta usar una fecha pasada
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  pastDate: (ctx) => ctx.reply('⌚ La nueva fecha debe ser futura.'),

  /**
   * Responde cuando el formato de fecha es inválido
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  invalidDateFormat: (ctx) =>
    ctx.reply(
      '🤯 El formato de fecha no es válido. Usa DD/MM/YY HH:MM o un formato similar.'
    ),

  /**
   * Responde cuando ocurre un error general
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  generalError: (ctx) => ctx.reply(GENERAL_ERROR_TEXT)
}
