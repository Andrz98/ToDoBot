import { Markup } from 'telegraf'
import { AuthorizedUser } from '../../models/authorizedUser.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'

export function registerTimezoneActions(bot) {
  // Paso 1: elijo zona y pido confirmación
  bot.action(/^set_tz_(.+)$/, async (ctx) => {
    const tz = ctx.match[1]
    ctx.session.flowType = 'timezone'
    ctx.session.pendingTz = tz
    await ctx.answerCbQuery()
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

  // Paso 2a: confirma “Sí”
  bot.action('confirm_tz_yes', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup()
    const tz = ctx.session.pendingTz
    const userId = ctx.from.id

    const updatedUser = await AuthorizedUser.findOneAndUpdate(
      { userId },
      { timezone: tz },
      { new: true }
    )
    // grabo también en sesión para uso futuro
    ctx.session.timezone = tz

    // fin del flujo
    ctx.session.flowType = null
    ctx.session.pendingTz = null

    if (!updatedUser) {
      return delayReply(
        ctx,
        '🥸 No estás autorizado para usar este bot.',
        { parse_mode: 'HTML' },
        800
      )
    }
    return delayReply(
      ctx,
      `🌐 Tu zona horaria ha sido guardada como: <b>${tz}</b>`,
      { parse_mode: 'HTML' },
      800
    )
  })

  // Paso 2b: confirma “No”
  bot.action('confirm_tz_no', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup()
    ctx.session.flowType = null
    ctx.session.pendingTz = null
    return delayReply(
      ctx,
      'Cambio de zona horaria cancelado.',
      { parse_mode: 'HTML' },
      800
    )
  })
}
