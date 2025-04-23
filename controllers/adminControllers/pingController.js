/**
 * Comando /ping - Respuesta rápida sin restricciones
 *
 * @param {object} ctx - Contexto del bot
 */
export const pingCommand = async (ctx) => {
  try {
    return ctx.reply('🏓 Pong! El bot está funcionando.')
  } catch (error) {
    console.error('❌ Error en /ping:', error.message)
    return ctx.reply('😵 Error inesperado al procesar /ping.')
  }
}
