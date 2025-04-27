import { Task } from '../../models/task.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
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
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    // 4) Limpio sesión
    ctx.session.flowType = null
    ctx.session.pendingClearToken = null

    // 5) Mensaje final con delay
    return delayReply(
      ctx,
      `🗑️ Se han eliminado ${result.deletedCount} tarea(s).`,
      500
    )
  })

  // 2) Confirma “no”
  bot.action(/^clear_confirm_(.+):no$/, async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)
    ctx.session.flowType = null
    ctx.session.pendingClearToken = null
    return delayReply(ctx, 'Operación cancelada.', 500)
  })
}
