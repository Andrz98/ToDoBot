import 'dotenv/config'
import { Telegraf } from 'telegraf'

import { pingCommand } from '../../controllers/adminControllers/pingController.js'
import taskController from '../../controllers/taskControllers/taskController.js'
import { editTask } from '../../controllers/taskControllers/editTask.js'
import { startCommand } from '../../controllers/startController/startController.js'
import { setTimezone } from '../../controllers/timeZoneController/setTimezone.js'

import { rateLimit } from '../../middlewares/secure/rateLimit.js'
import { sanitizeInput } from '../../middlewares/secure/sanitizeInput.js'
import { localSessionMiddleware } from '../../middlewares/session/localSession.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { flowGuard } from '../../middlewares/flowControl/flowGuard.js'

import { registerEditActions } from '../../actions/editAction/editActionHandlers.js'
import { registerForceReplyHandler } from '../../events/editForceReply/editForceReplyHandler.js'
import { registerFlowResetHandler } from '../../events/middlewareEventFlowReset/flowReset.js'
import { registerTimezoneActions } from '../../actions/timezoneAction/timezoneActionHandlers.js'
import { registerListActions } from '../../actions/listAction/listActionHandlers.js'
import { registerCompleteActions } from '../../actions/completeAction/completeActionHandler.js'
import { registerDeleteActions } from '../../actions/deleteAction/deleteActionHandlers.js'

// Me aseguro que el token exista
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('🪧 TELEGRAM_BOT_TOKEN no está definido en el archivo .env')
}

// Creo una instancia del bot con el Token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
console.log('[telegraf] Instancia de Telegraf creada')

// ====================================
// 🔰 Middlewares
// ====================================
bot.use(rateLimit)
bot.use(sanitizeInput)
bot.use(localSessionMiddleware)
bot.use(flowGuard)

// Opcional: loguear **todas** las actualizaciones que pasan por Telegraf
bot.on('update', (ctx) => {
  console.log(
    '[telegraf] updateType:',
    ctx.updateType,
    '| update payload:',
    ctx.update
  )
})

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
console.log('[telegraf] Registrando comando /add')
bot.command('add', isAuthorizedUser, taskController.addTask)

console.log('[telegraf] Registrando comando /list')
bot.command('list', isAuthorizedUser, taskController.listTasks)

console.log('[telegraf] Registrando comando /done')
bot.command('done', isAuthorizedUser, taskController.completeTask)

console.log('[telegraf] Registrando comando /delete')
bot.command('delete', isAuthorizedUser, taskController.deleteTask)

console.log('[telegraf] Registrando comando /edit')
bot.command('edit', isAuthorizedUser, editTask)

console.log('[telegraf] Registrando comando /clear')
bot.command('clear', isAuthorizedUser, taskController.clearTask)

console.log('[telegraf] Registrando comando /confirmclear')
bot.command('confirmclear', isAuthorizedUser, taskController.clearTask)

// ====================================
// 🔰 Manejo global de errores del bot
// ====================================
console.log('[telegraf] Configurando handler global de errores')
bot.catch((err, ctx) => {
  console.error('😵‍💫 Error interno del bot:', err)
  if (ctx?.reply) {
    return ctx.reply(
      '😵 Ocurrió un error inesperado. Intenta nuevamente más tarde.'
    )
  }
})

// ====================================
// 🔰 Registrar handlers de edición interactiva
// ====================================
registerEditActions(bot)
registerForceReplyHandler(bot)
registerFlowResetHandler(bot)
registerCompleteActions(bot)
registerDeleteActions(bot)

// ====================================
// 🔰 Registrar handlers de Timezone
// ====================================
registerTimezoneActions(bot)

// ====================================
// 🔰 Registrar handlers de list
// ====================================
registerListActions(bot)

// ====================================
// 🔰 Exportación para app.js (webhook)
// ====================================
const webhookCallback = bot.webhookCallback('/telegraf/tuttobot-path-seguro')

export { bot, webhookCallback }
