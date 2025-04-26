import { Markup } from 'telegraf'
/**
 * Construye el teclado inline de confirmación (Sí/No).
 * @returns {{ reply_markup: object }}
 */
export const buildInlineConfirm = () => {
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
