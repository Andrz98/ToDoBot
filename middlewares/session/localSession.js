// middlewares/session/localSession.js
import LocalSession from 'telegraf-session-local'
import { AuthorizedUser } from '../../models/authorizedUser.js'

/**
 * Middleware de sesión basado en archivo.
 * Guarda el estado de cada usuario en session.json
 *  — ctx.session.editing→ { id, oldName }
 *  — ctx.session.awaiting→ 'new_desc' | 'new_name' | 'new_date' | null
 */
const localSession = new LocalSession({
  // 1) Nombre correcto de la opción
  database: 'session.json',
  property: 'session',
  storage: LocalSession.storageFileAsync,
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2),
    deserialize: (str) => JSON.parse(str)
  },
  // 2) Clave de sesión basada en userId para TODOS los updates
  getSessionKey: (ctx) => {
    const userId = ctx.from?.id
    return userId ? String(userId) : undefined
  }
})

const persistentSession = localSession.middleware()

/**
 * Solo los usuarios autorizados (ctx.state.authorized, ver resolveAuthorization)
 * tienen sesión en disco. Cualquier otro remitente recibe una sesión efímera:
 * nada de lo que envíe queda en session.json, que así no crece con desconocidos.
 */
export const localSessionMiddleware = (ctx, next) => {
  if (ctx.state?.authorized === true) {
    return persistentSession(ctx, next)
  }
  ctx.session = {}
  return next()
}

/**
 * Borra de session.json las sesiones de quien ya no está autorizado (revocados
 * y restos de versiones anteriores). Devuelve cuántas se borraron.
 */
export async function pruneUnauthorizedSessions() {
  const authorized = new Set(
    (await AuthorizedUser.distinct('userId')).map(String)
  )
  const db = await localSession.DB
  const removed = await db
    .get('sessions')
    .remove(({ id }) => !authorized.has(String(id)))
    .write()
  return removed.length
}
