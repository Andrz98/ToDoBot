import { Markup } from 'telegraf'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import { replyInterface } from '../../utils/telegramUtils/messageLifecycle.js'
import { resetFlowSession } from '../../helpers/session/resetFlowSession.js'

/**
 * Un flujo abandonado (el usuario cerró Telegram, se fue a otra cosa…) no debe
 * bloquear comandos ni texto libre para siempre: si su interfaz ya caducó
 * (misma ventana que `TTL.INTERFACE`, ver messageLifecycle.js), se trata como
 * si no hubiera flujo activo. `flowExpiresAt` vive en la sesión en disco
 * (telegraf-session-local), así que esto también se cumple tras un reinicio.
 */
function isFlowExpired(session) {
  return Boolean(session?.flowType && session.flowExpiresAt < Date.now())
}

/**
 * Evita usar comandos mientras haya un flujo pendiente (/add, /edit, /delete, /complete, /timezone…).
 *
 * Requiere que, al inicio de cada flujo, hagas:
 *   ctx.session.flowType = 'add' | 'edit' | 'delete' | 'complete' | 'timezone'
 *   ctx.session.awaiting   = null | 'awaiting_*'
 */
export async function flowGuard(ctx, next) {
  if (isFlowExpired(ctx.session)) {
    debugLog(
      '⌛ [flowGuard] flujo expirado, libero la sesión:',
      ctx.session.flowType
    )
    resetFlowSession(ctx.session)
  }

  const { flowType, awaiting } = ctx.session || {}
  const cb = ctx.callbackQuery?.data

  // 0) Siempre permitimos el reset
  if (cb === 'flow_reset') {
    return next()
  }

  // 1) Si no hay flujo activo, seguimos
  if (!flowType) {
    return next()
  }

  // 1.bis) Si el mensaje es un nuevo comando (ej: /add, /edit, /delete...), permitimos que se inicie un nuevo flujo
  if (ctx.message?.text?.startsWith('/')) {
    debugLog(
      ' [flowGuard] Permitiendo nuevo comando:',
      '| flujo actual:',
      flowType
    )

    return next()
  }

  // 2) Permitir callbacks inline según cada flujo
  if (ctx.callbackQuery) {
    // El listado de /list (show_task_*, list_*) es de solo lectura, los botones
    // del menú principal (menu_*) equivalen a comandos y los del aviso de
    // recordatorio (rem_*), de la agenda (agenda_*) y de Google Calendar (cal_*)
    // actúan sobre un elemento concreto y validan su propio estado, sin tocar el
    // flujo activo: siempre se permiten
    if (/^(show_task_|list_|menu_|rem_|agenda_|cal_)/.test(cb)) {
      return next()
    }

    switch (flowType) {
      case 'add':
      case 'edit':
      case 'delete':
      case 'complete':
      case 'clear':
      case 'apt':
        if (
          flowType === 'edit'
            ? /^(edit_|select_edit_)/.test(cb)
            : new RegExp(`^${flowType}_`).test(cb)
        ) {
          return next()
        }
        break
      case 'reminder':
        if (/^((setReminder|saveReminder)::|reminder_)/.test(cb)) {
          return next()
        }
        break
      case 'timezone':
        // permitir tanto el menú inicial como la confirmación
        if (/^(set_tz_|confirm_tz_)/.test(cb)) {
          return next()
        }
        break
    }
  }

  // 3) Permitir forceReply (respuestas de texto sin “/”) si estamos esperando dato
  if (awaiting && ctx.message?.text && !ctx.message.text.startsWith('/')) {
    debugLog(
      '🟢 [flowGuard] Permitiendo forceReply. flowType:',
      flowType,
      '| awaiting:',
      awaiting
    )

    return next()
  }

  // 4) Bloquear todo lo demás
  debugLog(
    '⛔️ [flowGuard] BLOQUEADO. flowType:',
    flowType,
    '| awaiting:',
    awaiting,
    '| callback:',
    ctx.callbackQuery?.data
  )

  return replyInterface(
    ctx,
    `🚧 Tienes una acción “/${flowType}” pendiente. Por favor, pulsa el botón "Restablecer acción" o termina el flujo.`,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Restablecer acción', 'flow_reset')]
      ]).reply_markup
    }
  )
}
