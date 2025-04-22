// middlewares/session/localSession.js
import LocalSession from 'telegraf-session-local'

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

// Exportamos directamente el middleware de LocalSession
export const localSessionMiddleware = localSession.middleware()
