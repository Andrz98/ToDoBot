import { buildInlineConfirm } from '../replyConfirm/inlineConfirm.js'
/**
 * Construye texto y teclado inline para confirmar /clear
 *
 * @param {number} count – número de tareas a borrar
 * @param {string} token – identificador único de esta petición
 * @returns {{ text: string, reply_markup: object }}
 */
export const buildConfirmClearMenu = (count, token) => {
  // Reutilizamos inlineConfirm: prefix = `clear_confirm_${token}`
  const { reply_markup } = buildInlineConfirm(`clear_confirm_${token}`)
  return {
    text: `❗ Estás a punto de eliminar *${count}* tareas. ¿Confirmas?`,
    reply_markup
  }
}
