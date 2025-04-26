import { Markup } from 'telegraf'

/**
 * Este middleware se encarga de evitar usar comandos
 * mientras haya un flujo pendiente (/add, /edit, /delete, /clear, etc.)
 */
export async function flowGuard(ctx, next) {
  const { flowType, awaiting } = ctx.session || {}
  const data = ctx.callbackQuery?.data

  // 0) Siempre permitimos el botón de “Restablecer acción”
  if (data === 'flow_reset') {
    return next()
  }

  // 1) Si no hay flujo activo, seguimos
  if (!flowType) {
    return next()
  }

  // 2) Callbacks inline propios: delete_*, edit_*, set_tz_*, etc.
  if (data && new RegExp(`^${flowType}_`).test(data)) {
    return next()
  }

  // 3) Confirmaciones “extra” que no usan el prefijo flowType_
  //    – Para /delete: complete_confirm:yes|no
  //    – Para /clear : clear_confirm:yes|no
  if (flowType === 'delete' && data?.startsWith('complete_confirm:')) {
    return next()
  }
  if (flowType === 'clear' && data?.startsWith('clear_confirm:')) {
    return next()
  }

  // 4) Respuestas de forceReply en medio del flujo
  if (awaiting && ctx.message?.text && !ctx.message.text.startsWith('/')) {
    return next()
  }

  // 5) Cualquier otro mensaje o comando, lo bloqueamos
  return ctx.reply(
    `🚧 Tienes una acción “/${flowType}” pendiente. Por favor, pulsa "🔄 Restablecer acción" o termina el flujo.`,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('🔄 Restablecer acción', 'flow_reset')
      ]).reply_markup
    }
  )
}
