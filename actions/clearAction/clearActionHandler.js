import { Task } from '../../models/task.js'
import { flashReply } from '../../utils/delayUtils/flashReply.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'

/**
 * Registra los callbacks para completar o cancelar /clear
 */
export function registerClearActions(bot) {
  // 1) Confirma “sí”
  bot.action(/^clear_confirm_(.+):yes$/, async (ctx) => {
    const token = ctx.match[1]
    // 1.1) Validar token contra sesión
    if (ctx.session.pendingClearToken !== token) {
      return safeAnswerCbQuery(ctx, 'Operación inválida o expirada.', {
        show_alert: true
      })
    }

    // 2) Ejecutar borrado de tareas
    const userId = ctx.from.id
    const result = await Task.deleteMany({ userId })

    // 3) Quito spinner y botones
    await safeAnswerCbQuery(ctx, '👌🏽 Tareas eliminadas')
    await safeEditMessageReplyMarkup(ctx)

    // 4) Limpio sesión
    ctx.session.flowType = null
    ctx.session.pendingClearToken = null

  })

  // 2) Confirma “no”
  bot.action(/^clear_confirm_(.+):no$/, async (ctx) => {
    await safeAnswerCbQuery(ctx, 'Operación cancelada.')
    await safeEditMessageReplyMarkup(ctx)
    ctx.session.flowType = null
    ctx.session.pendingClearToken = null
  })
}
