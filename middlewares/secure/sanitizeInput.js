/**
 * Middleware para sanitizar el input del usuario
 */

// Etiqueta <script> con cualquier capitalización y con o sin atributos
// (el chequeo anterior solo pillaba el literal exacto en minúsculas)
const DANGEROUS_TAG = /<script[\s>]/i

export const sanitizeInput = async (ctx, next) => {
  // Solo sanitizamos si viene un mensaje con texto
  const incomingText = ctx.message?.text
  if (typeof incomingText === 'string') {
    // Rechazo mensajes vacíos o peligrosos
    const text = incomingText.trim()

    if (text.length === 0 || DANGEROUS_TAG.test(text)) {
      return ctx.reply(
        '🫸🏽 Entrada inválida. Inténtalo de nuevo con texto válido.'
      )
    }

    // Reasigno el texto limpio al contexto
    ctx.message.text = text
  }

  return next()
}
