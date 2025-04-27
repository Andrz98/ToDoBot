/**
 * Registra el callback `flow_reset` para limpiar cualquier flujo activo
 */
export function registerFlowResetHandler(bot) {
  bot.action('flow_reset', async (ctx) => {
    await ctx.answerCbQuery('✅ Acción restablecida')
    // Limpiamos todo el estado de flujo
    ctx.session.flowType = null
    ctx.session.awaiting = null
    ctx.session.editing = null
    ctx.session.pendingDelete = null
    ctx.session.pendingComplete = null
    ctx.session.pendingTz = null

    // Quitar inline keyboard
    if (ctx.update.callback_query.message) {
      await ctx.editMessageReplyMarkup({})
    }
    return ctx.reply('Flujo restablecido. Ya puedes usar comandos normalmente.')
  })
}
