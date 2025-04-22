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
  unauthorized: (ctx) =>
    ctx.reply('🥸 Debes estar autorizado para usar este bot.'),

  /**
   * Muestra ayuda sobre el formato del comando
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  formatHelp: (ctx) =>
    ctx.reply(
      '🧾 <b>Cómo usar /edit</b>\n\n' +
        '1️. Modo rápido con sintaxis key:value:\n' +
        '   /edit old:NombreAntiguo name:"NuevoNombre" desc:"Nueva descripción" date:DD/MM/AAAA[ HH:mm]\n\n' +
        '2️. Modo interactivo:\n' +
        '   Envía /edit NombreAntiguo y presiona uno de los botones:\n' +
        '   • ✔️ Nombre\n' +
        '   • 🔸 Descripción\n' +
        '   • 🔹 Fecha\n' +
        '   • ✖️ Cancelar\n',
      { parse_mode: 'HTML' }
    ),

  /**
   * Responde cuando no se encuentra la tarea
   * @param {object} ctx - Contexto de Telegraf
   * @param {string} name - Nombre de la tarea no encontrada
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  taskNotFound: (ctx, name) =>
    ctx.reply(`🤯 No se encontró ninguna tarea llamada "${name}"`),

  /**
   * Responde cuando no hay cambios en la tarea
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  noChanges: (ctx) => ctx.reply('🤯 No se encontraron cambios en la tarea.'),

  /**
   * Responde cuando la actualización fue exitosa
   * @param {object} ctx - Contexto de Telegraf
   * @param {string[]} changes - Lista de cambios realizados
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  success: (ctx, changes) =>
    ctx.reply(
      '<b>✏️ Tarea actualizada correctamente:</b>\n' + changes.join('\n'),
      { parse_mode: 'HTML' }
    ),

  /**
   * Responde cuando se intenta usar una fecha pasada
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  pastDate: (ctx) => ctx.reply('⌚ La nueva fecha debe ser futura.'),

  /**
   * Responde cuando se intenta usar un nombre vacío
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  emptyName: (ctx) =>
    ctx.reply('🤯 El nombre de la tarea no puede estar vacío.'),

  /**
   * Responde cuando el nombre es demasiado largo
   * @param {object} ctx - Contexto de Telegraf
   * @returns {Promise<object>} - Promesa con la respuesta
   */
  nameTooLong: (ctx) =>
    ctx.reply('🤯 El nombre de la tarea no puede superar los 100 caracteres.'),

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
  generalError: (ctx) =>
    ctx.reply('😵‍💫 Ocurrió un error al intentar editar tu tarea.')
}
