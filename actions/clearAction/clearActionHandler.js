import { Task } from '../../models/task.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { closeInterface } from '../../utils/telegramUtils/flowMessages.js'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import {
  UNAUTHORIZED_TEXT,
  GENERAL_ERROR_TEXT,
  ACTION_FINISHED_TEXT,
  CLEAR_DONE_TEXT
} from '../../helpers/replyMessages/genericReplyMessages.js'

/**
 * Registra los callbacks para completar o cancelar /clear
 */
export function registerClearActions(bot) {
  // 1) Confirma "sí"
  bot.action(/^clear_confirm_(.+):yes$/, async (ctx) => {
    if (!(await isUserAuthorized(ctx))) {
      ctx.session.flowType = null
      ctx.session.pendingClearToken = null
      return safeAnswerCbQuery(ctx, UNAUTHORIZED_TEXT, { show_alert: true })
    }

    const token = ctx.match[1]
    // Validar token contra sesión (también actúa como guard de doble-tap:
    // el token se anula tras el primer uso)
    if (ctx.session.pendingClearToken !== token) {
      return safeAnswerCbQuery(ctx, 'Operación inválida o expirada.', {
        show_alert: true
      })
    }

    try {
      const userId = ctx.from.id
      await Task.deleteMany({ userId, completed: true })

      ctx.session.flowType = null
      ctx.session.pendingClearToken = null

      await safeAnswerCbQuery(ctx, CLEAR_DONE_TEXT)
      return closeInterface(ctx, CLEAR_DONE_TEXT)
    } catch (error) {
      console.error('❌ Error en clear_confirm:yes:', error)
      ctx.session.flowType = null
      ctx.session.pendingClearToken = null
      return safeAnswerCbQuery(ctx, GENERAL_ERROR_TEXT, { show_alert: true })
    }
  })

  // 2) Confirma "no"
  bot.action(/^clear_confirm_(.+):no$/, async (ctx) => {
    ctx.session.flowType = null
    ctx.session.pendingClearToken = null
    await safeAnswerCbQuery(ctx, ACTION_FINISHED_TEXT)
    return closeInterface(ctx, ACTION_FINISHED_TEXT)
  })
}
