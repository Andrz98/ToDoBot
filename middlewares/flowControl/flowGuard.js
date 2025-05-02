import { Markup } from 'telegraf'

/**
 * Evita usar comandos mientras haya un flujo pendiente (/add, /edit, /delete, /complete, /timezone…).
 *
 * Requiere que, al inicio de cada flujo, hagas:
 *   ctx.session.flowType = 'add' | 'edit' | 'delete' | 'complete' | 'timezone'
 *   ctx.session.awaiting   = null | 'awaiting_*'
 */
export async function flowGuard(ctx, next) {
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

  // 2) Permitir callbacks inline según cada flujo
  if (ctx.callbackQuery) {
    switch (flowType) {
      case 'add':
      case 'edit':
      case 'delete':
      case 'complete':
        if (new RegExp(`^${flowType}_`).test(cb)) {
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
    return next()
  }

  // 4) Bloquear todo lo demás
  return ctx.reply(
    `🚧 Tienes una acción “/${flowType}” pendiente. Por favor, pulsa el botón "Restablecer acción" o termina el flujo.`,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Restablecer acción', 'flow_reset')]
      ]).reply_markup
    }
  )
}
