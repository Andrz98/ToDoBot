import { Markup } from 'telegraf'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  askInput,
  renderInterface,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'
import { registerDatePicker } from '../datePickerAction/registerDatePicker.js'
import {
  buildFrequencyMenu,
  isValidFrequency
} from '../../helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import {
  isEditActive,
  showEditMenu,
  applyEdit,
  loadEditedTask
} from './editMenu.js'

const PROMPTS = {
  edit_name: {
    awaiting: 'new_name',
    text: '🔺 Escribe el <b>nuevo nombre</b>:'
  },
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

const guard = (handler) => async (ctx) => {
  if (!isEditActive(ctx) || !isLiveInterface(ctx)) {
    return expireCallback(ctx)
  }
  await safeAnswerCbQuery(ctx)
  return handler(ctx)
}

export function registerFieldEditActions(bot) {
  for (const action of ['edit_name', 'edit_desc']) {
    bot.action(
      action,
      guard((ctx) => askField(ctx, action))
    )
  }

  bot.action(
    'edit_freq',
    guard(async (ctx) => {
      const timezone = await getUserTimezone(ctx.from.id)
      const { task } = await loadEditedTask(ctx, timezone)
      const { text, markup } = buildFrequencyMenu(
        (value) => `edit_freq_${value}`,
        task?.frequency,
        [[Markup.button.callback('↩️ Volver', 'edit_back')]]
      )
      return renderInterface(ctx, text, { parse_mode: 'HTML', ...markup })
    })
  )

  bot.action(
    /^edit_freq_(\w+)$/,
    guard((ctx) => {
      const frequency = ctx.match[1]
      if (!isValidFrequency(frequency)) {
        return showEditMenu(ctx)
      }
      return applyEdit(ctx, () => ({ frequency }))
    })
  )

  bot.action('edit_back', guard(showEditMenu))

  registerDatePicker(bot, 'edit', {
    isActive: isEditActive,
    onPicked: (ctx, date) => applyEdit(ctx, () => ({ date })),
    onBack: showEditMenu,
    onTextFallback: (ctx) => askField(ctx, 'edit_datetext')
  })
}
