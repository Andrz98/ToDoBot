import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  askInput,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { registerDatePicker } from '../datePickerAction/registerDatePicker.js'
import { isEditActive, showEditMenu, applyEdit } from './editMenu.js'

const PROMPTS = {
  edit_name: { awaiting: 'new_name', text: '🔺 Escribe el <b>nuevo nombre</b>:' },
  edit_desc: {
    awaiting: 'new_desc',
    text: '🔸 Escribe la <b>nueva descripción</b>:'
  },
  edit_datetext: {
    awaiting: 'new_date',
    text: '🔹 Escribe la <b>nueva fecha</b> (DD/MM/AAAA [HH:mm]) o solo la hora (HH:mm):'
  }
}

const askField = (ctx, action) => {
  const { awaiting, text } = PROMPTS[action]
  ctx.session.awaiting = awaiting
  return askInput(ctx, text, { parse_mode: 'HTML' })
}

export function registerFieldEditActions(bot) {
  for (const action of ['edit_name', 'edit_desc']) {
    bot.action(action, async (ctx) => {
      if (!isEditActive(ctx) || !isLiveInterface(ctx)) {
        return expireCallback(ctx)
      }
      await safeAnswerCbQuery(ctx)
      return askField(ctx, action)
    })
  }

  registerDatePicker(bot, 'edit', {
    isActive: isEditActive,
    onPicked: (ctx, date) => applyEdit(ctx, () => ({ date })),
    onBack: showEditMenu,
    onTextFallback: (ctx) => askField(ctx, 'edit_datetext')
  })
}
