import { Markup } from 'telegraf'

/**
 * Este middleware se encarga de evitar usar comandos
 * mientras haya un flujo pendiente (/add, /edit, /settimezone…).
 *
 * Requiere que, al inicio de cada flujo, hagas en tu handler:
 *   ctx.session.flowType = 'add'      // o 'edit' o 'timezone'
 *   ctx.session.awaiting  = null      // o 'awaiting_*'
 */
export async function flowGuard(ctx, next) {
  const { flowType, awaiting } = ctx.session || {}
  const data = ctx.callbackQuery?.data

  // 0) DEBUG
  console.log(
    '🚧 [flowGuard] flowType=',
    flowType,
    'awaiting=',
    awaiting,
    'callback=',
    data,
    'text=',
    ctx.message?.text
  )

  // 1) Botón “Restablecer acción”
  if (data === 'flow_reset') {
    console.log('🔄 [flowGuard] permitiendo flow_reset')
    return next()
  }

  // 2) Si no hay flujo activo, seguimos
  if (!flowType) {
    return next()
  }

  // 3) Si estamos en flujo timezone, permitimos sus callbacks:
  //    - Elegir zona: set_tz_<zona>
  //    - Confirmar:   confirm_tz_yes / confirm_tz_no
  if (
    ctx.callbackQuery &&
    flowType === 'timezone' &&
    (/^set_tz_/.test(data) || /^confirm_tz_/.test(data))
  ) {
    console.log('✅ [flowGuard] permitiendo timezone callback', data)
    return next()
  }

  // 4) Permitir callbacks inline de otros flujos (add_*, edit_*)
  if (ctx.callbackQuery && new RegExp(`^${flowType}_`).test(data)) {
    console.log('✅ [flowGuard] permitiendo inline callback', data)
    return next()
  }

  // 5) Permitir respuesta a forceReply dentro de un flujo con awaiting
  if (awaiting && ctx.message?.text && !ctx.message.text.startsWith('/')) {
    console.log('✅ [flowGuard] permitiendo forceReply dentro de flujo')
    return next()
  }

  // 6) Bloquear cualquier otro comando/mensaje
  console.log('❌ [flowGuard] bloqueando, invitando a restablecer')
  return ctx.reply(
    `🚧 Tienes una acción “/${flowType}” pendiente. Por favor, pulsa "🔄 Restablecer acción" o completa el flujo.`,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('🔄 Restablecer acción', 'flow_reset')
      ]).reply_markup
    }
  )
}
