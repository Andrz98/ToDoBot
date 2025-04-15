import { isUserAuthorized } from '@/helpers/userAuthorizedTaskController/isUserAuthorized.js'

export const isAuthorizedUser = async (ctx, next) => {
  try {
    const authorized = await isUserAuthorized(ctx)
    if (!authorized) {
      return ctx.reply('🥸 Debes estar autorizado para usar este bot.')
    }
    return next()
  } catch (error) {
    console.error('Error al verificar autorización:', error)
    return ctx.reply('😵‍💫 Error interno de autorización.')
  }
}
