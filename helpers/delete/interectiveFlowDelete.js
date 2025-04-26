// helpers/delete/interactiveFlowDelete.js
import { Markup } from 'telegraf'
import { buildInlineConfirm } from '../replyConfirm/inlineConfirm'

/**
 * Construye el teclado inline para seleccionar la tarea a eliminar.
 * @param {Array<{ _id: string, name: string }>} tasks
 * @returns {{ reply_markup: object }}
 */
export const buildDeleteMenu = (tasks) => {
  const buttons = tasks.map((t) =>
    Markup.button.callback(t.name, `delete_select:${t._id}`)
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
export const buildConfirmDeleteMenu = () => {
  return buildInlineConfirm('delete_confirm')
}
