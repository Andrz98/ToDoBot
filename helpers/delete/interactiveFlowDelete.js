// helpers/delete/interactiveFlowDelete.js
import { Markup } from 'telegraf'
import { buildInlineConfirm } from '../replyConfirm/inlineConfirm.js'

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
 * Construye el mensaje y teclado para confirmar borrado.
 * @param {import('../../models/task.js').Task} task
 * @returns {{ text: string, reply_markup: object }}
 */
export const buildConfirmDeleteMenu = (task) => {
  const { reply_markup } = buildInlineConfirm('delete_confirm')
  return {
    text: `¿Seguro que deseas eliminar la tarea:\n\n<b>${task.name}</b>?`,
    reply_markup
  }
}
