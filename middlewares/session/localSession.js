// middlewares/session/localSession.js
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

// Handler original proporcionado por telegraf-session-local
const sessionHandler = localSession.middleware()

// Wrapper para depurar antes y después de cada uso de la sesión
export const localSessionMiddleware = async (ctx, next) => {
  // Antes de cargar/actualizar la sesión
  console.log('[session] antes →', ctx.session)

  // Ejecuta el middleware original
  await sessionHandler(ctx, async () => {
    // Después de que se haya cargado la sesión desde el archivo
    console.log('[session] después →', ctx.session)
    // Continúa con los siguientes middlewares o handlers
    await next()
  })
}
