import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { safeEditMessageReplyMarkup } from '../../utils/retryUtils/safeEditMessageReplyMarkup.js'
import { delayReply } from '../../utils/delayUtils/delayReply.js'
import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { Task } from '../../models/task.js'

/**
 * Envía el menú dinámico de creación según el estado de ctx.session.pendingTask.
 */
function showAddMenu(ctx) {
  const { text, markup } = buildAddMenu(ctx.session.pendingTask)
  return ctx.reply(text, markup)
}

export function registerAddAction(bot) {
  // 1. /add -> inicializa sesión y muestra menú de creación
  bot.command('add', isAuthorizedUser, (ctx) => {
    ctx.session.flowType = 'add'
    ctx.session.pendingTask = {}
    ctx.session.awaiting = null
    return showAddMenu(ctx)
  })

  // 2. Usuario pulsa "Crear tarea" -> muestro el menú de campos
  bot.action('add_create', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = null
    return showAddMenu(ctx)
  })

  // 3. Selección de campo "Nombre"
  bot.action('add_field_name', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'add_name'
    return ctx.reply('Por favor, ingresa el *nombre* de la tarea:', {
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true }
    })
  })

  // 4. Selección de campo "Descripción"
  bot.action('add_field_desc', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'add_desc'
    return ctx.reply('Ingresa la _descripción_ de la tarea (opcional):', {
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true }
    })
  })

  // 5. Selección de campo "Fecha"
  bot.action('add_field_date', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    ctx.session.awaiting = 'add_date'
    return ctx.reply('Ingresa la fecha de la tarea (ej. DD/MM/YYYY HH:mm):', {
      reply_markup: { force_reply: true }
    })
  })

  // 6. Captura de respuestas force-reply
  bot.on('message', async (ctx) => {
    const { flowType, awaiting, pendingTask } = ctx.session
    if (flowType !== 'add' || !awaiting || !ctx.message?.text) {
      return
    }
    const text = ctx.message.text.trim()
    // elimina el mensaje de force-reply
    await ctx.deleteMessage().catch(() => {})

    switch (awaiting) {
      case 'add_name':
        if (!text) {
          return ctx.reply(
            'El nombre es obligatorio. Por favor, intenta de nuevo.',
            { reply_markup: { force_reply: true } }
          )
        }
        pendingTask.name = text
        break

      case 'add_desc':
        pendingTask.description = text
        break

      case 'add_date': {
        const { date } = detectAndParseDate([text], ctx.session.timezone)
        if (!date) {
          return ctx.reply('Fecha inválida. Usa el formato DD/MM/YYYY HH:mm.', {
            reply_markup: { force_reply: true }
          })
        }
        pendingTask.reminderAt = date
        break
      }

      default:
        return
    }

    // guardamos estado y reiniciamos awaiting
    ctx.session.pendingTask = pendingTask
    ctx.session.awaiting = null

    // volvemos a mostrar el menú dinámico con los botones pendientes
    return showAddMenu(ctx)
  })

  // 7. Confirmación final
  bot.action('add_confirm', async (ctx) => {
    await safeAnswerCbQuery(ctx)
    await safeEditMessageReplyMarkup(ctx)

    const { pendingTask } = ctx.session
    const userId = ctx.from.id

    const task = new Task({
      userId,
      name: pendingTask.name,
      description: pendingTask.description || '',
      frequency: 'daily',
      reminderAt: pendingTask.reminderAt || new Date()
    })
    await task.save()

    // limpiamos la sesión
    delete ctx.session.flowType
    delete ctx.session.awaiting
    delete ctx.session.pendingTask

    return delayReply(
      ctx,
      `Tarea creada:\n• ${task.name}\n• ${task.frequency}\n${task.reminderAt.toLocaleString()}`
    )
  })
}
