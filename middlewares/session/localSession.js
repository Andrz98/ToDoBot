import LocalSession from 'telegraf-session-local'

/**
 * Middleware de sesión basado en archivo.
 * Guarda el estado de cada usuario en session.json
 *  — ctx.session.editing→ { id, tz }
 *  — ctx.session.awaiting→ 'new_desc' | 'new_name' | 'new_date' | null
 */

const localSession = new LocalSession({
  databasa: 'session.json',
  property: 'session',
  storage: LocalSession.storageFileAsync,
  format: {
    serialize: (obj) => JSON.stringify(obj),
    deserialize: (str) => JSON.parse(str)
  }
})

export const localSessionMiddleware = localSession.middleware()
