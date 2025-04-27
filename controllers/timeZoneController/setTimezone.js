import { Markup } from 'telegraf'
import { buildTimezoneMenu } from '../../helpers/timezone/FlowTimezone/interactiveFlowTimezone.js'
import { AuthorizedUser } from '../../models/authorizedUser.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'

/**
 * Comando /settimezone - Inicia el flujo para cambiar huso horario.
 * Muestra menú o, si recibe argumento, pregunta confirmación.
 */
export const setTimezone = async (ctx) => {
  console.log('🕒 [DEBUG:setTimezone] entrada, sesión:', ctx.session)
  try {
    const userId = ctx.from.id
    const input = ctx.message.text.replace(/^\/settimezone\s*/i, '').trim()

    const allowedTimezones = ['Europe/Madrid', 'America/Bogota']

    // 1) Sin argumento: muestro solo la otra zona
    if (!input) {
      // arranco el flujo timezone
      ctx.session.flowType = 'timezone'
      ctx.session.pendingTz = null
      const user = await AuthorizedUser.findOne({ userId })
      const current = user?.timezone
      const { text, markup } = buildTimezoneMenu(current)
      return safeReply(ctx, text, { parse_mode: 'HTML', ...markup })
    }

    // 2) Validación
    if (!allowedTimezones.includes(input)) {
      return safeReply(
        ctx,
        '🌐 Zona horaria no válida. Solo puedes elegir entre:\n' +
          '- <b>Europe/Madrid</b>\n' +
          '- <b>America/Bogota</b>',
        { parse_mode: 'HTML' }
      )
    }

    // 3) Inicio confirmación: guardo en sesión y pregunto
    ctx.session.pendingTz = input
    return safeReply(
      ctx,
      `¿Estás segur@ de cambiar tu zona horaria a <b>${input}</b>?`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('Sí', 'confirm_tz_yes')],
          [Markup.button.callback('No', 'confirm_tz_no')]
        ]).reply_markup
      }
    )
  } catch (error) {
    console.error('😵‍💫 Error en /settimezone:', error.message)
    return safeReply(ctx, '😵‍💫 Ocurrió un error al procesar tu zona horaria.')
  }
}
