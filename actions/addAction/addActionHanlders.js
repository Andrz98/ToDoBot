import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import {
  buildAddMenu,
  buildName
} from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { buildFrequencyMenu } from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { buildInlineConfirm } from '../../helpers/replyConfirm/inlineConfirm.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { RecurrenceTemplate } from '../../models/recurrenceTemplate.js'
import { TaskInstance } from '../../models/taskInstance.js'

export function registerAddAction(bot) {
  // 1. /add → menú de plantillas o “nueva”
  bot.command('add', isAuthorizedUser, async (ctx) => {
    const { text, reply_markup } = await buildAddMenu(ctx)
    return ctx.reply(text, { reply_markup })
  })

  // 1.1 “Nueva plantilla”
  bot.action('add_tpl_new', async (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.pendingAdd = {}
    ctx.session.awaiting = 'add_name'
    await safeAnswerCbQuery(ctx)

    const { text, reply_markup } = buildName()
    return ctx.reply(text, { reply_markup })
  })

  // 1.2 “Plantilla existente” (solo IDs, no “new”)
  bot.action(/^add_tpl_([0-9a-fA-F]{24})$/, async (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.pendingAdd = { templateId: ctx.match[1] }
    ctx.session.awaiting = null
    await safeAnswerCbQuery(ctx)

    const { text, reply_markup } = buildFrequencyMenu()
    return ctx.reply(text, { reply_markup })
  })

  // 2. Captura nombre (awaiting === 'add_name')
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, pendingAdd } = ctx.session
    if (
      flowType === 'add' &&
      awaiting === 'add_name' &&
      ctx.message?.text &&
      !ctx.message.text.startsWith('/')
    ) {
      pendingAdd.name = ctx.message.text.trim()
      await ctx.deleteMessage()

      ctx.session.awaiting = null
      await safeAnswerCbQuery(ctx)

      const { text, reply_markup } = buildFrequencyMenu()
      return ctx.reply(text, { reply_markup })
    }
  })

  // 3. Selección de frecuencia
  bot.action(/^add_freq_(daily|weekly|monthly|yearly)$/, async (ctx) => {
    const frequency = ctx.match[1]
    Object.assign(ctx.session.pendingAdd, { frequency })
    await safeAnswerCbQuery(ctx)

    const question = `Frecuencia seleccionada: ${frequency}. ¿Confirmas crear esta plantilla?`
    const confirmMk = buildInlineConfirm('add_confirm')
    return ctx.reply(question, { parse_mode: 'Markdown', ...confirmMk })
  })

  // 4. Confirmación Sí → crear plantilla + instancia
  bot.action('add_confirm:yes', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    const { templateId, name, frequency } = ctx.session.pendingAdd
    const userId = ctx.from.id

    const tpl = templateId
      ? await RecurrenceTemplate.findByIdAndUpdate(
          templateId,
          { name, frequency },
          { new: true }
        )
      : await RecurrenceTemplate.create({
          userId,
          name,
          frequency,
          active: true
        })

    const now = new Date()
    const expiresAt = new Date(now.valueOf() + 24 * 3600 * 1000)
    await TaskInstance.create({
      userId,
      templateId: tpl._id,
      name,
      description: tpl.description,
      reminderAt: now,
      frequency: tpl.frequency,
      status: 'pending',
      expiresAt
    })

    // Limpio sesión
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingAdd

    return delayReply(
      ctx,
      `Plantilla "${tpl.name}" creada/actualizada con frecuencia "${tpl.frequency}". Primera instancia generada.`,
      { parse_mode: 'Markdown' },
      500
    )
  })

  // 5. Confirmación No → cancelar
  bot.action('add_confirm:no', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingAdd

    return delayReply(
      ctx,
      'Creación de plantilla cancelada.',
      { parse_mode: 'Markdown' },
      500
    )
  })
}
