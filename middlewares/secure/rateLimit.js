// middlewares/secure/rateLimit.js
import { replyTemporary } from '../../utils/telegramUtils/messageLifecycle.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

/**
 * Dos cupos por usuario:
 *  - command: comandos y texto suelto, 5 cada 7 s
 *  - interaction: botones y pasos de un flujo (forceReply), más holgado para no
 *    frenar a quien navega un menú, pero con techo: cada pulsación consulta Mongo
 */
const LIMITS = Object.freeze({
  command: { max: 5, windowMs: 7_000 },
  interaction: { max: 30, windowMs: 10_000 }
})
const buckets = { command: new Map(), interaction: new Map() }

// Barrido de usuarios inactivos: sin él los Map crecen con cada usuario distinto que escribe al bot
setInterval(() => {
  const now = Date.now()
  for (const [kind, users] of Object.entries(buckets)) {
    for (const [userId, timestamps] of users) {
      if (timestamps.every((ts) => now - ts >= LIMITS[kind].windowMs)) {
        users.delete(userId)
      }
    }
  }
}, LIMITS.command.windowMs).unref()

const isInteraction = (ctx) =>
  Boolean(
    ctx.callbackQuery ||
    ctx.session?.flowType ||
    (ctx.session?.awaiting &&
      ctx.message?.text &&
      !ctx.message.text.startsWith('/'))
  )

export const rateLimit = async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId) {
    return next()
  }

  const kind = isInteraction(ctx) ? 'interaction' : 'command'
  const { max, windowMs } = LIMITS[kind]
  const users = buckets[kind]
  const now = Date.now()

  // Mantener solo timestamps dentro de la ventana
  const recent = (users.get(userId) || []).filter((ts) => now - ts < windowMs)

  if (recent.length >= max) {
    const text = `😮 Has enviado más de ${max} acciones en ${windowMs / 1000} s. Por favor, espera antes de continuar.`
    if (ctx.callbackQuery) {
      return safeAnswerCbQuery(ctx, text).catch(() => {})
    }
    return replyTemporary(ctx, text, { parse_mode: 'HTML' })
  }

  // Registrar esta acción
  recent.push(now)
  users.set(userId, recent)

  return next()
}
