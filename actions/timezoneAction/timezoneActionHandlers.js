import { Markup } from 'telegraf'
import { closeInterface, renderInterface } from '../../utils/telegramUtils/flowMessages.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

import { AuthorizedUser } from '../../models/authorizedUser.js'
import { debugLog } from '../../utils/logUtils/debugLog.js'
import { ALLOWED_TIMEZONES } from '../../helpers/taskHelpers/timezone/allowedTimezones.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  OPERATION_CANCELLED_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

export function registerTimezoneActions(bot) {
  // Paso 1: elijo zona y pido confirmación
  bot.action(/^set_tz_(.+)$/, async (ctx) => {
    const tz = ctx.match[1]
    if (!ALLOWED_TIMEZONES.includes(tz)) {
      return safeAnswerCbQuery(ctx, 'Zona horaria no válida.', {
        show_alert: true
      })
    }
    debugLog('🕒 [DEBUG:set_tz] zona elegida:', tz)
    ctx.session.flowType = 'timezone'
    ctx.session.pendingTz = tz
    await safeAnswerCbQuery(ctx)
    return renderInterface(
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

  // Paso 2a: confirma "Sí"
  bot.action('confirm_tz_yes', async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      ctx.session.flowType = null
      ctx.session.pendingTz = null
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    const tz = ctx.session.pendingTz
    if (!ALLOWED_TIMEZONES.includes(tz)) {
      ctx.session.flowType = null
      return safeAnswerCbQuery(
        ctx,
        'La solicitud expiró. Usa /settimezone de nuevo.',
        { show_alert: true }
      )
    }

    try {
      const userId = ctx.from.id
      const updatedUser = await AuthorizedUser.findOneAndUpdate(
        { userId },
        { timezone: tz },
        { new: true }
      )

      ctx.session.flowType = null
      ctx.session.pendingTz = null

      if (!updatedUser) {
        // El usuario dejó de estar autorizado entre el chequeo y la escritura
        return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
      }

      const doneText = `✅ Zona horaria actualizada a ${tz}.`
      await safeAnswerCbQuery(ctx, doneText)
      return closeInterface(ctx, doneText)
    } catch (error) {
      console.error('❌ Error en confirm_tz_yes:', error)
      ctx.session.flowType = null
      ctx.session.pendingTz = null
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  // Paso 2b: confirma "No"
  bot.action('confirm_tz_no', async (ctx) => {
    ctx.session.flowType = null
    ctx.session.pendingTz = null
    await safeAnswerCbQuery(ctx, OPERATION_CANCELLED_TEXT)
    return closeInterface(ctx, OPERATION_CANCELLED_TEXT)
  })
}
