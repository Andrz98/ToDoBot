import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { buildFrequencyMenu } from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { buildInlineConfirm } from '../../helpers/replyConfirm/inlineConfirm.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { RecurrenceTemplate } from '../../models/recurrenceTemplate.js'
import { TaskInstance } from '../../models/taskInstance.js'

/**
 * Registra TODO el flujo de /add: comando + selección de frecuencia + confirmación.
 * @param {import('telegraf').Telegraf} bot
 */

export function registerAddAction(bot) {
  // 1. Comando /add → Menú de frecuencia
  bot.command('add', isAuthorizedUser, (ctx) => {
    const { text, markup } = buildFrequencyMenu()
    return ctx.reply(text, markup)
  })

  // 2. Selección de frecuencia
  bot.action(/^add_freq_(daily|weekly|monthly|yearly)$/, async (ctx) => {
    const frequency = ctx.match[1]
    ctx.session.pendingAdd = { frequency }

    await safeAnswerCbQuery(ctx)
    const question = `Frecuencia seleccionada: ${frequency}. ¿Confirmas crear esta plantilla?`
    const confirmMk = buildInlineConfirm('add_confirm')
    return ctx.reply(question, { parse_mode: 'Markdown', ...confirmMk })
  })

  // 3.1 Confirmación Sí → Creamos plantilla + primera instancia
  bot.action('add_confirm:yes', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    const { frequency } = ctx.session.pendingAdd
    const userId = ctx.from.id

    // Creamos la plantilla
    const tpl = await RecurrenceTemplate.create({
      userId,
      name: `Tarea ${frequency}`,
      frequency,
      active: true
    })

    // Generamos la primera instancia para hoy
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000)
    await TaskInstance.create({
      userId,
      templateId: tpl._id,
      name: tpl.name,
      description: tpl.description,
      reminderAt: now,
      frequency: tpl.frequency,
      status: 'pending',
      expiresAt
    })

    delete ctx.session.pendingAdd

    return delayReply(
      ctx,
      `Plantilla ${tpl.name} creada con frecuencia ${tpl.frequency}. Se ha generado la primera instancia para hoy.`,
      { parse_mode: 'Markdown' },
      500
    )
  })

  // 3.2 Confirmación No → Cancelamos
  bot.action('add_confirm:no', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)
    delete ctx.session.pendingAdd
    return delayReply(
      ctx,
      'Creación de plantilla cancelada.',
      { parse_mode: 'Markdown' },
      500
    )
  })
}
