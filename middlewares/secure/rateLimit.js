// Middleware para limitar el uso de comandos

const userTimestamps = new Map()

const LIMIT_MS = 1500 // Tiempo mínimo entre comandos por usuario

export const rateLimit = async (ctx, next) => {
  const userId = ctx.from?.id
  const now = Date.now()

  if (!userId) {
    return next()
  }

  const lastTime = userTimestamps.get(userId) || 0
  const diff = now - lastTime

  if (diff < LIMIT_MS) {
    return ctx.reply(
      '😮 Estás enviando comandos muy rápido. Espera un segundo.'
    )
  }

  userTimestamps.set(userId, now)
  return next()
}
