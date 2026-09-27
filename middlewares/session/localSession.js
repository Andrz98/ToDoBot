// middlewares/session/localSession.js
import { session } from 'telegraf'
import { AuthorizedUser } from '../../models/authorizedUser.js'
import { Session } from '../../models/session.js'

/**
 * Middleware de sesión guardado en MongoDB (colección sessions).
 * Guarda el estado de cada usuario:
 *  — ctx.session.editing→ { id, oldName }
 *  — ctx.session.awaiting→ 'new_desc' | 'new_name' | 'new_date' | null
 */
const mongoStore = {
  get: async (key) => (await Session.findById(key).lean())?.data,
  set: (key, data) =>
    Session.updateOne(
      { _id: key },
      { data, updatedAt: new Date() },
      { upsert: true }
    ),
  delete: (key) => Session.deleteOne({ _id: key })
}

const persistentSession = session({
  store: mongoStore,
  defaultSession: () => ({}),
  // Clave de sesión basada en userId para TODOS los updates
  getSessionKey: (ctx) => {
    const userId = ctx.from?.id
    return userId ? String(userId) : undefined
  }
})

/**
 * Solo los usuarios autorizados (ctx.state.authorized, ver resolveAuthorization)
 * tienen sesión persistente. Cualquier otro remitente recibe una sesión efímera:
 * nada de lo que envíe llega a Mongo, que así no crece con desconocidos.
 */
export const localSessionMiddleware = (ctx, next) => {
  if (ctx.state?.authorized === true) {
    return persistentSession(ctx, next)
  }
  ctx.session = {}
  return next()
}

/**
 * Borra las sesiones de quien ya no está autorizado (revocados). Devuelve
 * cuántas se borraron. Las inactivas las elimina el índice TTL del modelo.
 */
export async function pruneUnauthorizedSessions() {
  const authorized = (await AuthorizedUser.distinct('userId')).map(String)
  const { deletedCount } = await Session.deleteMany({
    _id: { $nin: authorized }
  })
  return deletedCount
}
