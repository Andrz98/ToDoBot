import 'dotenv/config'
import { createBot } from './botFactory.js'

import { pingCommand } from '../../controllers/adminControllers/pingController.js'
import taskController from '../../controllers/taskControllers/taskController.js'
import { startCommand } from '../../controllers/startController/startController.js'
import { setTimezone } from '../../controllers/timeZoneController/setTimezone.js'

import { rateLimit } from '../../middlewares/secure/rateLimit.js'
import { sanitizeInput } from '../../middlewares/secure/sanitizeInput.js'
import { localSessionMiddleware } from '../../middlewares/session/localSession.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { flowGuard } from '../../middlewares/flowControl/flowGuard.js'

import { registerEditActions } from '../../actions/editAction/index.js'
import { registerForceReplyHandler } from '../../events/editForceReply/editForceReplyHandler.js'
import { registerFlowResetHandler } from '../../events/middlewareEventFlowReset/flowReset.js'
import { registerTimezoneActions } from '../../actions/timezoneAction/timezoneActionHandlers.js'
import { registerListActions } from '../../actions/listAction/listActionHandlers.js'
import { registerCompleteActions } from '../../actions/completeAction/completeActionHandler.js'
import { registerDeleteActions } from '../../actions/deleteAction/deleteActionHandlers.js'
import { registerClearActions } from '../../actions/clearAction/clearActionHandler.js'
import { registerAddAction } from '../../actions/addAction/index.js'

// Me aseguro que el token exista
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('🪧 TELEGRAM_BOT_TOKEN no está definido en el archivo .env')
}

// Crear instancia de bot con keep-alive HTTP
const bot = createBot(process.env.TELEGRAM_BOT_TOKEN)
console.log('[telegraf] Instancia de Telegraf creada con keep-alive HTTP')

// ====================================
// 🔰 Middlewares
// ====================================
bot.use(rateLimit)
bot.use(sanitizeInput)
bot.use(localSessionMiddleware)
bot.use((ctx, next) => {
  console.log('🔥 [DEBUG] Antes de flowGuard: ', {
    updateType: ctx.updateType,
    callbackData: ctx.callbackQuery?.data,
    messageText: ctx.message?.text,
    session: ctx.session
  })
  return next()
})
bot.use(flowGuard)

// ====================================
// 🔰 Comando /ping /settimezone
// ====================================
bot.command('ping', pingCommand)
bot.command('settimezone', setTimezone)

// ====================================
// 🔰 Comando /start
// ====================================
bot.start(startCommand)

// ====================================
// 🔰 Comandos protegidos por middleware
// ====================================
console.log('[telegraf] Registrando comando /list')
bot.command('list', isAuthorizedUser, taskController.listTasks)
bot.command('done', isAuthorizedUser, taskController.completeTask)
bot.command('delete', isAuthorizedUser, taskController.deleteTask)
bot.command('clear', isAuthorizedUser, taskController.clearTask)
bot.command('confirmclear', isAuthorizedUser, taskController.clearTask)

// ====================================
// 🔰 Registrar handlers de edición interactiva
// ====================================
registerAddAction(bot)
registerEditActions(bot)
console.log('🧪 registerEditActions invocado en telegraf.js')
registerFlowResetHandler(bot)
registerCompleteActions(bot)
registerDeleteActions(bot)
registerClearActions(bot)
registerTimezoneActions(bot)
registerListActions(bot)

//  FINALMENTE el .on('message') y forceReplyHandler 🔻
registerForceReplyHandler(bot)

bot.on('message', async (ctx, next) => {
  console.log('🧪 [TRACE] bot.on(message) interceptó:', ctx.message?.text)
  return next()
})

// ====================================
// 🔰 Manejo global de errores del bot
// ====================================
bot.catch((err, ctx) => {
  console.error('😵‍💫 Error interno del bot:', err)
  if (ctx?.reply) {
    return ctx.reply(
      '😵 Ocurrió un error inesperado. Intenta nuevamente más tarde.'
    )
  }
})

// ====================================
// 🔰 Exportación para app.js (webhook)
// ====================================
const webhookCallback = bot.webhookCallback('/telegraf/tuttobot-path-seguro')
export { bot, webhookCallback }
