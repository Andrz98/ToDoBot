// actions/addActions/addActionHandlers.js

import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import {
  buildName,
  buildDesc
} from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { buildFrequencyMenu } from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { buildInlineConfirm } from '../../helpers/replyConfirm/inlineConfirm.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { Task } from '../../models/task.js'

export function registerAddAction(bot) {
  // 1. /add → pedir nombre
  bot.command('add', isAuthorizedUser, (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.awaiting = 'add_name'
    return ctx.reply(...buildName())
  })

  // 2. Capturar nombre
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, pendingTask = {} } = ctx.session
    if (
      flowType === 'add' &&
      awaiting === 'add_name' &&
      ctx.message.text &&
      !ctx.message.text.startsWith('/')
    ) {
      pendingTask.name = ctx.message.text.trim()
      ctx.session.pendingTask = pendingTask
      ctx.session.awaiting = 'add_desc'
      await ctx.deleteMessage()
      return ctx.reply(...buildDesc())
    }
  })

  // 3. Capturar descripción (opcional)
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, pendingTask } = ctx.session
    if (
      flowType === 'add' &&
      awaiting === 'add_desc' &&
      ctx.message.text &&
      !ctx.message.text.startsWith('/')
    ) {
      pendingTask.description = ctx.message.text.trim()
      ctx.session.pendingTask = pendingTask
      ctx.session.awaiting = null
      await ctx.deleteMessage()
      return ctx.reply(...buildFrequencyMenu())
    }
  })

  // 4. Selección de frecuencia
  bot.action(/^add_freq_(daily|weekly|monthly|yearly)$/, async (ctx) => {
    await safeAnswerCbQuery(ctx)
    const freq = ctx.match[1]
    ctx.session.pendingTask.frequency = freq

    const { reply_markup } = buildInlineConfirm('add_confirm')
    return ctx.reply(
      `Frecuencia seleccionada: ${freq}. ¿Confirmas crear esta tarea?`,
      { parse_mode: 'Markdown', reply_markup }
    )
  })

  // 5. Confirmación Sí → crear Task
  bot.action('add_confirm:yes', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    const { pendingTask } = ctx.session
    const userId = ctx.from.id
    const now = new Date()
    const reminderAt = now

    const task = new Task({
      userId,
      name: pendingTask.name,
      description: pendingTask.description || '',
      frequency: pendingTask.frequency,
      reminderAt
    })
    await task.save()

    // Limpiamos sesión
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask

    return delayReply(
      ctx,
      `Tarea creada:\n• ${task.name}\n• ${task.frequency}\n📅 ${reminderAt.toLocaleString()}`,
      { parse_mode: 'Markdown' },
      500
    )
  })

  // 6. Confirmación No → cancelar
  bot.action('add_confirm:no', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask
    return delayReply(ctx, 'Creación cancelada.', {}, 500)
  })
}
