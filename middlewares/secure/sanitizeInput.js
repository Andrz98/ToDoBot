/**
 * Middleware para sanitizar el input del usuario
 */

export const sanitizeInput = async (ctx, next) => {
  // Solo sanitizamos si viene un mensaje con texto
  const incomingText = ctx.message?.text
  if (typeof incomingText === 'string') {
    // Rechazo mensajes vacíos o peligrosos
    const text = incomingText.trim()

    if (text.length === 0 || text.includes('<script>')) {
      return ctx.reply(
        '🫸🏽 Entrada inválida. Inténtalo de nuevo con texto válido.'
      )
    }

    // Reasigno el texto limpio al contexto
    ctx.message.text = text
  }

  return next()
}
