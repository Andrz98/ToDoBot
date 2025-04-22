// config/telegraf/telegraf.js
import 'dotenv/config'
import { Telegraf } from 'telegraf'

import { pingCommand } from '../../controllers/startController/pingController.js'
import taskController from '../../controllers/taskControllers/taskController.js'
import { startCommand } from '../../controllers/startController/startController.js'
import { setTimezone } from '../../controllers/timeZoneController/setTimezone.js'

import { rateLimit } from '../../middlewares/secure/rateLimit.js'
import { sanitizeInput } from '../../middlewares/secure/sanitizeInput.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { localSessionMiddleware } from '../../middlewares/session/localSession.js'

console.log('[telegraf] Empezando configuración del bot')

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
console.log('[telegraf] Registrando middleware rateLimit')
bot.use(rateLimit)

console.log('[telegraf] Registrando middleware sanitizeInput')
bot.use(sanitizeInput)

console.log('[telegraf] Registrando middleware localSessionMiddleware')
bot.use(localSessionMiddleware)

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
console.log('[telegraf] Registrando comando /ping')
bot.command('ping', pingCommand)

console.log('[telegraf] Registrando comando /settimezone')
bot.command('settimezone', setTimezone)

// 🔰 Comando /start
// ====================================
console.log('[telegraf] Registrando comando /start')
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
bot.command('edit', isAuthorizedUser, taskController.editTask)

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
import { registerEditActions } from '../../actions/editAction/editActionHandlers.js'
import { registerForceReplyHandler } from '../../events/forceReply/forceReplyHandler.js'

console.log('[telegraf] Registrando editActionHandlers')
registerEditActions(bot)
console.log('[telegraf] editActionHandlers registrados')

console.log('[telegraf] Registrando forceReplyHandler')
registerForceReplyHandler(bot)
console.log('[telegraf] forceReplyHandler registrado')

// ====================================
// 🔰 Exportación para app.js (webhook)
// ====================================
const webhookCallback = bot.webhookCallback('/telegraf/tuttobot-path-seguro')
console.log(
  '[telegraf] Configuración completa, exportando bot y webhookCallback'
)

export { bot, webhookCallback }
