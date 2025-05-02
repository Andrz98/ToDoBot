import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { buildAddMenu } from '../../helpers/taskHelpers/add/interactiveFlowAdd.js'

/**
 * Controlador para /add que lanza el menú inicial de plantillas.
 * @param {import('telegraf').Context} ctx
 */
export const addTask = async (ctx) => {
  // 1) Autorización
  if (!(await isUserAuthorized(ctx))) {
    return ctx.reply('Debes estar autorizado para usar este bot.')
  }

  // 2) Arrancamos el flujo de creación de plantilla
  const { text, reply_markup } = await buildAddMenu(ctx)
  return ctx.reply(text, { reply_markup })
}
