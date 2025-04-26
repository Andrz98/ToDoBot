export function registerFlowResetHandler(bot) {
  bot.action('flow_reset', async (ctx) => {
    await ctx.answerCbQuery() // quita el “cargando…” de Telegram
    ctx.session.flowType = null // limpia el tipo de flujo
    ctx.session.awaiting = null // limpia el awaiting
    ctx.session.editing = null // limpia cualquier edición pendiente

    return ctx.reply(
      'Acción restablecida. Ahora puedes usar comandos normalmente.',
      {
        parse_mode: 'HTML'
      }
    )
  })
}
