// helpers/complete/interactiveFlowComplete.js
import { Markup } from 'telegraf'
import { buildInlineConfirm } from '../../replyConfirm/inlineConfirm.js'

/**
 * Construye el teclado inline para seleccionar la tarea a completar.
 * @param {Array<{ _id: string, name: string }>} tasks
 * @returns {{ reply_markup: object }}
 */
export const buildCompleteMenu = (tasks) => {
  const buttons = tasks.map((t) =>
    Markup.button.callback(t.name, `complete_select:${t._id}`)
  )

  return {
    reply_markup: Markup.inlineKeyboard(
      // Cada fila con un botón
      buttons.map((btn) => [btn]),
      { columns: 1 }
    ).reply_markup
  }
}

/**
 * Construye el teclado inline de confirmación (Sí/No).
 * @returns {{ reply_markup: object }}
 */
export const buildConfirmCompleteMenu = () => {
  return buildInlineConfirm('complete_confirm')
}
