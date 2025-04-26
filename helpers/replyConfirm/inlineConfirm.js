// helpers/common/inlineConfirm.js
import { Markup } from 'telegraf'

/**
 * Construye un teclado inline de confirmación (Sí/No)
 * prefijando la acción de callback para distinguir contextos.
 *
 * @param {string} prefix – e.g. 'delete_confirm' o 'complete_confirm'
 * @returns {{ reply_markup: object }}
 */
export const buildInlineConfirm = (prefix) => ({
  reply_markup: Markup.inlineKeyboard(
    [
      [Markup.button.callback('Sí', `${prefix}:yes`)],
      [Markup.button.callback('No', `${prefix}:no`)]
    ],
    { columns: 1 }
  ).reply_markup
})
