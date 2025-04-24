/**
 * Este middleware se encarga de evitar usar comandos
 * mientras haya un flujo pendiente (/add, /edit…).
 *
 * Requiere que, al inicio de /add o /edit, hagas:
 *   ctx.session.flowType = 'add'   // o 'edit'
 *   ctx.session.awaiting   = null  // o 'awaiting_*'
 */
export async function flowGuard(ctx, next) {
  const { flowType, awaiting } = ctx.session || {}

  // 0) Si no hay un flujo activo, seguimos normalmente
  if (!flowType) {
    return next()
  }

  // 1) Permitir callbacks inline del flujo: add_* o edit_*
  if (
    ctx.callbackQuery &&
    new RegExp(`^${flowType}_`).test(ctx.callbackQuery.data)
  ) {
    return next()
  }

  // 2) Permitir respuesta a forceReply dentro del flujo
  if (awaiting && ctx.message?.text && !ctx.message.text.startsWith('/')) {
    return next()
  }

  // 3) Bloquear cualquier otro comando o mensaje
  return ctx.reply(
    `🚧 Tienes una acción “/${flowType}” pendiente. Por favor, pulsa el botón "Guardar" o responde al prompt para completarla.`,
    { parse_mode: 'HTML' }
  )
}
