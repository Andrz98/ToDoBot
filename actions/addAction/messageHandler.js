import { detectAndParseDate } from '../../helpers/taskHelpers/date/detectAndParseDate.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import {
  askInput,
  consumeInput
} from '../../utils/telegramUtils/flowMessages.js'
import { showAddMenu } from './fieldActions.js'

const FIELD_OF = { add_name: 'name', add_desc: 'description' }

export function registerMessageHandler(bot) {
  bot.on('message', async (ctx, next) => {
    const { flowType, awaiting, pendingTask } = ctx.session
    // Un comando escrito a mitad de flujo es un comando, no la respuesta al prompt
    if (
      flowType !== 'add' ||
      !awaiting ||
      !ctx.message?.text ||
      ctx.message.text.startsWith('/')
    ) {
      return typeof next === 'function' ? next() : undefined
    }

    const text = ctx.message.text.trim()
    // Pregunta y respuesta siguen visibles unos segundos; el flujo avanza ya
    consumeInput(ctx)

    if (awaiting === 'add_date') {
      const timezone = await getUserTimezone(ctx.from.id)
      const { date } = detectAndParseDate([text], timezone)
      if (!date) {
        return askInput(ctx, 'Fecha inválida. Usa el formato DD/MM/YYYY HH:mm.')
      }
      pendingTask.reminderAt = date
    } else if (FIELD_OF[awaiting]) {
      pendingTask[FIELD_OF[awaiting]] = text
    } else {
      return
    }

    ctx.session.pendingTask = pendingTask
    return showAddMenu(ctx)
  })
}
