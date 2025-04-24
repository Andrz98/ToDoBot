import { Markup } from 'telegraf'
import { AuthorizedUser } from '../../models/authorizedUser.js'
import { delayedReply } from '../../utils/delayUtils/delayUtils.js'

/**
 * Registra los callbacks para los botones de /settimezone
 * @param {import('telegraf').Telegraf} bot
 */
export function registerTimezoneActions(bot) {
  // 1) El usuario elige la zona: guardamos y pedimos confirmación
  bot.action(/^set_tz_(.+)$/, async (ctx) => {
    const tz = ctx.match[1] // ej. "Europe/Madrid"
    ctx.session.flowType = 'timezone'
    ctx.session.pendingTz = tz // almacenamos temporalmente
    await ctx.answerCbQuery() // quita el “cargando…” del botón

    return ctx.reply(
      `¿Estás segur@ de cambiar tu zona horaria a <b>${tz}</b>?`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('Sí', 'confirm_tz_yes')],
          [Markup.button.callback('No', 'confirm_tz_no')]
        ]).reply_markup
      }
    )
  })

  // 2a) Si confirma “Sí”: actualizamos la base de datos
  bot.action('confirm_tz_yes', async (ctx) => {
    await ctx.answerCbQuery() // quito “cargando…”
    await ctx.editMessageReplyMarkup() // elimino el inline keyboard

    const tz = ctx.session.pendingTz
    const userId = ctx.from.id
    const updatedUser = await AuthorizedUser.findOneAndUpdate(
      { userId },
      { timezone: tz },
      { new: true }
    )

    // fin del flujo
    ctx.session.flowType = null
    ctx.session.pendingTz = null

    if (!updatedUser) {
      return delayedReply(
        ctx,
        '🥸 No estás autorizado para usar este bot.',
        { parse_mode: 'HTML' },
        800
      )
    }

    return delayedReply(
      ctx,
      `🌐 Tu zona horaria ha sido guardada como: <b>${tz}</b>`,
      { parse_mode: 'HTML' },
      800
    )
  })

  // 2b) Si confirma “No”: cancelamos y limpiamos
  bot.action('confirm_tz_no', async (ctx) => {
    await ctx.answerCbQuery() // quito “cargando…”
    await ctx.editMessageReplyMarkup() // elimino el inline keyboard

    // fin del flujo
    ctx.session.flowType = null
    ctx.session.pendingTz = null

    return delayedReply(
      ctx,
      'Cambio de zona horaria cancelado.',
      { parse_mode: 'HTML' },
      800
    )
  })
}
