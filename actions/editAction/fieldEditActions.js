import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'

const FIELDS = [
  { action: 'edit_name', key: 'new_name' },
  { action: 'edit_desc', key: 'new_desc' },
  { action: 'edit_date', key: 'new_date' },
  { action: 'edit_save', key: null }
]

export function registerFieldEditActions(bot) {
  for (const { action, key } of FIELDS) {
    bot.action(action, async (ctx) => {
      await safeAnswerCbQuery(ctx)
      if (action === 'edit_save') {
        return
      } // queda en saveEditAction.js

      // forzamos el prompt
      ctx.session.awaiting = key
      const prompts = {
        new_name: '🔺 Escribe el <b>nuevo nombre</b> de la tarea:',
        new_desc: '🔸 Escribe la <b>nueva descripción</b>:',
        new_date: '🔹 Escribe la <b>nueva fecha</b> (DD/MM/YYYY [HH:mm]):'
      }
      return ctx.reply(prompts[key], {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      })
    })
  }
}
