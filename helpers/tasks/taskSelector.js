// helpers/tasks/taskSelector.js
import { findTask } from './findTask.js'

/**
 * Registra un handler para cualquier callback del tipo `${prefix}_{taskId}`
 * @param {import('telegraf').Telegraf} bot
 * @param {string} prefix – Prefijo de la acción, e.g. 'select_edit'
 * @param {(ctx: object, task: object)=>Promise<any>} onSelect
 *        – Callback que recibe ctx y la tarea cargada
 */
function registerTaskSelector(bot, prefix, onSelect) {
  const re = new RegExp(`^${prefix}_(.+)$`)
  bot.action(re, async (ctx) => {
    await ctx.answerCbQuery()
    const taskId = ctx.match[1]
    const userId = ctx.from.id

    const task = await findTask(userId, { id: taskId })
    if (!task) {
      return ctx.reply('🤯 No se encontró la tarea seleccionada.', {
        parse_mode: 'HTML'
      })
    }

    return onSelect(ctx, task)
  })
}

// Añadimos propiedades fuera del cuerpo
registerTaskSelector.getKeyboard = async () => {
  throw new Error('getKeyboard aún no implementado')
}

registerTaskSelector.resolve = async () => {
  throw new Error('resolve aún no implementado')
}

// Exportamos como función con propiedades
export { registerTaskSelector }
