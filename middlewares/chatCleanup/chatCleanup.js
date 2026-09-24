import {
  TTL,
  scheduleDeletion,
  renewDeletion
} from '../../utils/telegramUtils/messageLifecycle.js'

/**
 * Limpieza transversal del chat:
 *  - Pulsar un botón renueva el TTL de la interfaz que lo contiene: nada
 *    desaparece mientras el usuario la está usando. Todo mensaje con botones
 *    es una interfaz. Los avisos del scheduler también llevan botones, pero sus
 *    handlers (alertActions.js) los retiran al pulsarlos.
 *  - Un comando se limpia DESPUÉS de procesarse (aunque su handler falle),
 *    con la misma cadencia que cualquier paso intermedio.
 */
export async function chatCleanup(ctx, next) {
  const tapped = ctx.callbackQuery?.message?.message_id
  if (tapped) {
    renewDeletion(ctx, tapped, TTL.INTERFACE)
    // Un flujo con interacción reciente no debe caducar bajo el usuario
    if (ctx.session?.flowType) {
      ctx.session.flowExpiresAt = Date.now() + TTL.INTERFACE
    }
  }

  const isCommand = ctx.message?.text?.startsWith('/')
  try {
    return await next()
  } finally {
    if (isCommand) {
      scheduleDeletion(ctx, ctx.message.message_id, TTL.STEP)
    }
  }
}
