import 'dotenv/config'
import { Telegraf } from 'telegraf'

import { pingCommand } from '../../controllers/startController/pingController.js'
import taskController from '../../controllers/taskControllers/taskController.js'
import { isAuthorizedUser } from '../../middlewares/access/isAuthorizedUser.js'
import { startCommand } from '../../controllers/startController/startController.js'
import { setTimezone } from '../../controllers/userTimezoneController/setTimezone.js'

import { rateLimit } from '../../middlewares/secure/rateLimit.js'
import { sanitizeInput } from '../../middlewares/secure/sanitizeInput.js'

// Me aseguro que el token exista
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('🪧 TELEGRAM_BOT_TOKEN no está definido en el archivo .env')
}

// Creo una instancia del bot con el Token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

// ====================================
// 🔰 Middlewares
// ====================================
bot.use(rateLimit)
bot.use(sanitizeInput)

// ====================================
// 🔰 Comando /ping /settimezone
// ====================================
bot.command('ping', pingCommand)
bot.command('settimezone', setTimezone)

// 🔰 Comando /start
// ====================================
bot.start(startCommand)

// ====================================
// 🔰 Comandos protegidos por middleware
// ====================================
bot.command('add', isAuthorizedUser, taskController.addTask)
bot.command('list', isAuthorizedUser, taskController.listTasks)
bot.command('done', isAuthorizedUser, taskController.completeTask)
bot.command('delete', isAuthorizedUser, taskController.deleteTask)
bot.command('edit', isAuthorizedUser, taskController.editTask)
bot.command('clear', isAuthorizedUser, taskController.clearTask)
bot.command('confirmclear', isAuthorizedUser, taskController.clearTask)

// ====================================
// 🔰 Manejo global de errores del bot
// ====================================
bot.catch((err, ctx) => {
  console.error('😵‍💫 Error interno del bot:', err.message)
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
