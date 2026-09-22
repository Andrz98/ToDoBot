import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { registerDatePicker } from '../datePickerAction/registerDatePicker.js'
import {
  askInput,
  renderInterface,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'

const PROMPTS = {
  add_field_name: { key: 'add_name', text: '🔺 Escribe el nombre de la tarea:' },
  add_field_desc: {
    key: 'add_desc',
    text: '🔸 Escribe la descripción de la tarea (opcional):'
  },
  add_datetext: {
    key: 'add_date',
    text: '🔹 Escribe la fecha (DD/MM/AAAA HH:mm, "mañana"…):'
  }
}

export const isAddActive = (ctx) =>
  ctx.session?.flowType === 'add' && Boolean(ctx.session.pendingTask)

/** Pinta el menú de /add con lo introducido hasta ahora. */
export async function showAddMenu(ctx) {
  ctx.session.awaiting = null
  const timezone = await getUserTimezone(ctx.from.id)
  const { text, markup } = buildAddMenu(ctx.session.pendingTask, timezone)
  return renderInterface(ctx, text, markup)
}

async function askField(ctx, action) {
  const { key, text } = PROMPTS[action]
  ctx.session.awaiting = key
  return askInput(ctx, text)
}

export function registerFieldActions(bot) {
  for (const action of ['add_field_name', 'add_field_desc']) {
    bot.action(action, async (ctx) => {
      if (!isAddActive(ctx) || !isLiveInterface(ctx)) {
        return expireCallback(ctx)
      }
      await safeAnswerCbQuery(ctx)
      return askField(ctx, action)
    })
  }

  registerDatePicker(bot, 'add', {
    isActive: isAddActive,
    onPicked: (ctx, date) => {
      ctx.session.pendingTask.reminderAt = date
      return showAddMenu(ctx)
    },
    onBack: showAddMenu,
    onTextFallback: (ctx) => askField(ctx, 'add_datetext')
  })
}
