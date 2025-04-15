/**
 * Middleware para sanitizar el input del usuario
 */

export const sanitizeInput = async (ctx, next) => {
  if (ctx.message.text) {
    // Rechazo mensajes vacíos o peligrosos
    const text = ctx.message.text.trim()

    if (text.length === 0 || text.includes('<scrip>')) {
      return ctx.reply(
        '🫸🏽 Entrada inválidad. Intentalo de nuevo con texto válido.'
      )
    }

    // Reasigno el texto limpio al contexto
    ctx.message.text = text
  }

  return next()
}
