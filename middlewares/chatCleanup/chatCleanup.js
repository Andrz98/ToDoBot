import {
  TTL,
  deleteNow,
  scheduleDeletion,
  renewDeletion
} from '../../utils/telegramUtils/messageLifecycle.js'
import { sendMainMenu } from '../../helpers/menu/mainMenu.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'

/**
 * Limpieza transversal del chat:
 *  - Pulsar un botón renueva el TTL de la interfaz que lo contiene: nada
 *    desaparece mientras el usuario la está usando. Todo mensaje con botones
 *    es una interfaz (salvo el menú principal, que no caduca). Los avisos del
 *    scheduler también llevan botones, pero sus handlers (alertActions.js) los
 *    retiran al pulsarlos.
 *  - Un comando se limpia DESPUÉS de procesarse (aunque su handler falle),
 *    con la misma cadencia que cualquier paso intermedio.
 *  - El usuario solo escribe cuando un botón se lo pide (`session.awaiting`):
 *    cualquier otro mensaje que no sea un comando se borra en el acto y no llega
 *    a ningún handler. Telegram no permite desactivar la caja de texto.
 *  - Cuando un flujo termina, sus mensajes se limpian solos: el usuario
 *    recupera el menú principal abajo para no quedarse con el chat vacío.
 */
export async function chatCleanup(ctx, next) {
  const tapped = ctx.callbackQuery?.message?.message_id
  if (tapped) {
    // Renovar el menú principal le pondría un plazo de borrado
    if (tapped !== ctx.session?.startMessageId) {
      renewDeletion(ctx, tapped, TTL.INTERFACE)
    }
    // Un flujo con interacción reciente no debe caducar bajo el usuario
    if (ctx.session?.flowType) {
      ctx.session.flowExpiresAt = Date.now() + TTL.INTERFACE
    }
  }

  const isCommand = ctx.message?.text?.startsWith('/')
  if (ctx.message && !isCommand && !ctx.session?.awaiting) {
    return deleteNow(ctx, ctx.message.message_id)
  }

  const hadFlow = Boolean(ctx.session?.flowType)
  const menuBefore = ctx.session?.startMessageId
  try {
    return await next()
  } finally {
    if (isCommand) {
      scheduleDeletion(ctx, ctx.message.message_id, TTL.STEP)
    }
    // Si el propio handler envió el menú (/start), no se duplica
    if (
      hadFlow &&
      !ctx.session?.flowType &&
      ctx.session?.startMessageId === menuBefore
    ) {
      await sendMainMenu(ctx).catch((error) =>
        debugLog('🧹 [chatCleanup] menú no reenviado:', error?.message)
      )
    }
  }
}
