import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'

const FIELDS = [
  { action: 'add_create', key: null, prompt: null },
  {
    action: 'add_field_name',
    key: 'add_name',
    prompt: 'Por favor, ingresa el *nombre* de la tarea:'
  },
  {
    action: 'add_field_desc',
    key: 'add_desc',
    prompt: 'Ingresa la _descripción_ de la tarea (opcional):'
  },
  {
    action: 'add_field_date',
    key: 'add_date',
    prompt: 'Ingresa la fecha de la tarea (ej. DD/MM/YYYY HH:mm):'
  }
]

export function registerFieldActions(bot) {
  for (const { action, key, prompt } of FIELDS) {
    bot.action(action, async (ctx) => {
      await safeAnswerCbQuery(ctx)

      if (action === 'add_create') {
        // Simplemente mostramos/EDITAMOS el menú
        ctx.session.awaiting = null
        const timezone = await getUserTimezone(ctx.from.id)
        const { text, markup } = buildAddMenu(ctx.session.pendingTask, timezone)

        // El usuario está interactuando con el mensaje que realmente pulsó:
        // si difiere del que teníamos trackeado (p.ej. un /add abandonado y
        // reiniciado), ese mensaje pasa a ser la fuente de verdad.
        const tappedId = ctx.callbackQuery?.message?.message_id
        if (
          tappedId &&
          ctx.session.menuMessageId &&
          tappedId !== ctx.session.menuMessageId
        ) {
          ctx.session.menuMessageId = tappedId
        }
        const targetId = ctx.session.menuMessageId ?? tappedId

        if (!targetId) {
          const newMsg = await ctx.reply(text, markup)
          ctx.session.menuMessageId = newMsg.message_id
          return
        }

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            targetId,
            null,
            text,
            markup
          )
        } catch {
          const newMsg = await ctx.reply(text, markup)
          ctx.session.menuMessageId = newMsg.message_id
        }
      } else {
        // Entramos en modo force-reply para rellenar este campo
        ctx.session.awaiting = key
        return ctx.reply(prompt, {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        })
      }
    })
  }
}
