// helpers/complete/interactiveFlowComplete.js
import { Markup } from 'telegraf'

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
  return {
    reply_markup: Markup.inlineKeyboard(
      [
        [Markup.button.callback('Sí', 'complete_confirm:yes')],
        [Markup.button.callback('No', 'complete_confirm:no')]
      ],
      { columns: 1 }
    ).reply_markup
  }
}
