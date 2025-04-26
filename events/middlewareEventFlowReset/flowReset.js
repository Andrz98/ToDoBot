/**
 * Este handler registra el callback `flow_reset` para restablecer el flujo de edición de tareas
 */
export function registerFlowResetHandler(bot) {
  bot.action('flow_reset', async (ctx) => {
    // Reconoce el click, para que el botón deje interpretar que "hay una query pendiente"
    await ctx.answerCbQuery('Acción restablecida') // quita el “cargando…” de Telegram
    // Limpia Todo el estado del flujo
    ctx.session.flowType = null // limpia el tipo de flujo
    ctx.session.awaiting = null // limpia el awaiting
    ctx.session.editing = null // limpia cualquier edición pendiente

    // Eliminar el teclado inline de ese mensaje
    if (ctx.update.callback_query.message) {
      await ctx.editMessageReplyMarkup({})
    }

    return ctx.reply(
      'Flujo restablecido. Ahora puedes usar comandos normalmente.'
    )
  })
}
