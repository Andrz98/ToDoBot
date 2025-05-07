import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

const FIELDS = [
  { action: 'add_create', key: null, prompt: null },
  { action: 'add_field_name', key: 'add_name', prompt: 'Ingresa nombre:' },
  {
    action: 'add_field_desc',
    key: 'add_desc',
    prompt: 'Ingresa descripción (opcional):'
  },
  {
    action: 'add_field_date',
    key: 'add_date',
    prompt: 'Ingresa fecha (DD/MM/YYYY HH:mm):'
  }
]

export function registerFieldActions(bot) {
  for (const { action, key, prompt } of FIELDS) {
    bot.action(action, async (ctx) => {
      await safeAnswerCbQuery(ctx)

      if (action === 'add_create') {
        // Inicia el flujo y muestra/edita el menú
        ctx.session.awaiting = null
        const { text, markup } = buildAddMenu(ctx.session.pendingTask)
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          ctx.session.menuMessageId,
          null,
          text,
          { parse_mode: 'Markdown', ...markup }
        )
      } else {
        // Entrar en modo force-reply para el campo seleccionado
        ctx.session.awaiting = key
        return ctx.reply(prompt, {
          reply_markup: { force_reply: true }
        })
      }
    })
  }
}
