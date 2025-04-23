import { findTaskForController } from '../userTaskBynameController/findTaskForController'

/**
 * Registra un handler para cualquier callback del tipo `${prefix}_{taskId}`
 * @param {import('telegraf').Telegraf} bot
 * @param {string}                  prefix  – Prefijo de la acción, e.g. 'select_edit'
 * @param {(ctx: object, task: object)=>Promise<any>} onSelect
 *        – Callback que recibe ctx y la tarea cargada
 */

export function registerTaskSelector(bot, prefix, onSelect) {
  const re = new RegExp(`^${prefix}_(.+)$`)
  bot.action(re, async (ctx) => {
    await ctx.answerCbQuery() // 1) Acknowledge
    const taskId = ctx.match[1] // lo que viene tras "select_edit_"
    const userId = ctx.from.id

    // Carga la tarea
    const task = await findTaskForController(userId, null, taskId)
    if (!task) {
      return ctx.reply('🤯 No se encontró la tarea seleccionada.', {
        parse_mode: 'HTML'
      })
    }

    // Delegamos al callback específico
    return onSelect(ctx, task)
  })
}
