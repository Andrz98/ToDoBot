import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'

export async function isAuthorizedUser(ctx, next) {
  let authorized
  try {
    authorized = await isUserAuthorized(ctx)
  } catch (error) {
    console.error('❌ Error al verificar autorización:', error)
    return ctx.reply('😵‍💫 Error interno de autorización.')
  }

  if (!authorized) {
    return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
  }
  return next()
}
