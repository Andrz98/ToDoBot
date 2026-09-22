import {
  TTL,
  scheduleDeletion,
  deleteNow,
  replyTemporary,
  replyInterface
} from './messageLifecycle.js'
import { debugLog } from '../logUtils/debugLog.js'
import { safeEditMessageText } from '../retryUtils/safeEditMessageText.js'

/**
 * Mensajes de un flujo interactivo. La sesión guarda como mucho:
 *  - menuMessageId:   la interfaz viva del flujo (se edita en sitio)
 *  - promptMessageId: el force-reply que espera texto del usuario
 */

const NOT_MODIFIED = /message is not modified/i
const EXPIRED_TEXT = 'Esta acción ya no está disponible.'

const tappedMessageId = (ctx) => ctx.callbackQuery?.message?.message_id

/** Borra en el acto los mensajes de un flujo anterior (menú y prompt pendientes). */
export async function discardFlowMessages(ctx) {
  const { menuMessageId, promptMessageId } = ctx.session ?? {}
  delete ctx.session?.menuMessageId
  delete ctx.session?.promptMessageId
  await deleteNow(ctx, promptMessageId)
  await deleteNow(ctx, menuMessageId)
}

/** Abre la interfaz de un flujo nuevo sustituyendo la del anterior. */
export async function openInterface(ctx, text, extra = {}) {
  await discardFlowMessages(ctx)
  const msg = await replyInterface(ctx, text, extra)
  ctx.session.menuMessageId = msg?.message_id
  return msg
}

/**
 * Pinta la interfaz del flujo editando el mensaje existente; si no se puede
 * editar, envía uno nuevo y ese pasa a ser la interfaz. Renueva su TTL.
 */
export async function renderInterface(ctx, text, extra = {}) {
  const targetId = ctx.session.menuMessageId ?? tappedMessageId(ctx)
  if (targetId) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        targetId,
        undefined,
        text,
        extra
      )
      scheduleDeletion(ctx, targetId, TTL.INTERFACE)
      ctx.session.menuMessageId = targetId
      return targetId
    } catch (error) {
      if (NOT_MODIFIED.test(error?.description ?? error?.message ?? '')) {
        return targetId
      }
      debugLog('🧹 [renderInterface] edición fallida, envío nuevo mensaje')
    }
  }
  const msg = await replyInterface(ctx, text, extra)
  ctx.session.menuMessageId = msg?.message_id
  return msg?.message_id
}

/**
 * Cierra la interfaz con su resultado: queda visible unos segundos, sin botones,
 * y después se limpia. También retira el prompt pendiente, si lo había.
 */
export async function closeInterface(ctx, text, extra = {}) {
  const tapped = tappedMessageId(ctx)
  const targetId = tapped ?? ctx.session?.menuMessageId
  await deleteNow(ctx, ctx.session?.promptMessageId)
  if (ctx.session) {
    delete ctx.session.promptMessageId
    delete ctx.session.menuMessageId
  }

  if (targetId) {
    try {
      if (tapped) {
        await safeEditMessageText(ctx, text, extra)
      } else {
        await ctx.telegram.editMessageText(ctx.chat.id, targetId, undefined, text, {
          reply_markup: { inline_keyboard: [] },
          ...extra
        })
      }
      scheduleDeletion(ctx, targetId, TTL.NOTICE)
      return
    } catch {
      await deleteNow(ctx, targetId)
    }
  }
  await replyTemporary(ctx, text, extra)
}

/** Pide texto al usuario con force-reply. Sigue visible mientras se espera. */
export async function askInput(ctx, text, extra = {}) {
  scheduleDeletion(ctx, ctx.session.promptMessageId, TTL.STEP)
  const msg = await replyInterface(ctx, text, {
    ...extra,
    reply_markup: { force_reply: true }
  })
  ctx.session.promptMessageId = msg?.message_id
  return msg
}

/**
 * La respuesta del usuario ya se procesó: ella y su prompt se quedan unos
 * segundos para que se vea qué se introdujo, y luego se limpian.
 */
export function consumeInput(ctx) {
  scheduleDeletion(ctx, ctx.message?.message_id, TTL.STEP)
  scheduleDeletion(ctx, ctx.message?.reply_to_message?.message_id, TTL.STEP)
  scheduleDeletion(ctx, ctx.session.promptMessageId, TTL.STEP)
  delete ctx.session.promptMessageId
}

/**
 * El botón pulsado pertenece a la interfaz viva del flujo. Un menú antiguo que
 * siga en pantalla (borrado fallido, flujo reiniciado) no debe actuar sobre el nuevo.
 */
export function isLiveInterface(ctx) {
  const live = ctx.session?.menuMessageId
  const tapped = tappedMessageId(ctx)
  return !live || !tapped || live === tapped
}

/** Callback de una interfaz que ya no corresponde al flujo activo. */
export async function expireCallback(ctx) {
  await ctx.answerCbQuery(EXPIRED_TEXT).catch(() => {})
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {})
  scheduleDeletion(ctx, tappedMessageId(ctx), TTL.NOTICE)
}
