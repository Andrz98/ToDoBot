// middlewares/secure/rateLimit.js

const userActions = new Map()

// Permitir hasta 3 acciones cada 7 000 ms (7 s)
const MAX_ACTIONS = 3
const WINDOW_MS = 7_000

export const rateLimit = async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId) {
    return next()
  }

  // 1) Si estamos en un flujo interactivo, no aplicamos rate limit
  if (ctx.session?.flowType) {
    return next()
  }

  // 2) Eximir callbacks inline (bot.action) para no bloquear botones
  if (ctx.callbackQuery) {
    return next()
  }

  // 3) Eximir respuestas a forceReply dentro de un flujo
  if (
    ctx.session?.awaiting &&
    ctx.message?.text &&
    !ctx.message.text.startsWith('/')
  ) {
    return next()
  }

  const now = Date.now()
  const timestamps = userActions.get(userId) || []

  // Mantener solo timestamps dentro de la ventana
  const recent = timestamps.filter((ts) => now - ts < WINDOW_MS)

  if (recent.length >= MAX_ACTIONS) {
    return ctx.reply(
      `😮 Has enviado más de ${MAX_ACTIONS} acciones en ${WINDOW_MS / 1000} s. Por favor, espera antes de continuar.`,
      { parse_mode: 'HTML' }
    )
  }

  // Registrar esta acción
  recent.push(now)
  userActions.set(userId, recent)

  return next()
}
