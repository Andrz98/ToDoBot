import { Markup } from 'telegraf'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

import { AuthorizedUser } from '../../models/authorizedUser.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'

export function registerTimezoneActions(bot) {
  // Paso 1: elijo zona y pido confirmación
  bot.action(/^set_tz_(.+)$/, async (ctx) => {
    const tz = ctx.match[1]
    debugLog('antes clear:', ctx.session)
    ctx.session.flowType = 'timezone'
    ctx.session.pendingTz = tz
    debugLog('después clear:', ctx.session)
    await safeAnswerCbQuery(ctx)
    return safeReply(
      ctx,
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
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)
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
      return flashReply(ctx, '🥸 No estás autorizado para usar este bot.', {
        parse_mode: 'HTML'
      })
    }
    return flashReply(ctx, '🛫 zona cambiada')
  })

  // Paso 2b: confirma “No”
  bot.action('confirm_tz_no', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)
    ctx.session.flowType = null
    ctx.session.pendingTz = null
    return flashReply(ctx, 'Cambio de zona horaria cancelado.', {
      parse_mode: 'HTML'
    })
  })
}
