import 'dotenv/config'
import { Telegraf } from 'telegraf'

import taskController from '@/controllers/taskControllers/taskController.js'
import { isAuthorizedUser } from '@/middlewares/access/isAuthorizedUser.js'
import { startCommand } from '@/controllers/startController/startController.js'

import { rateLimit } from '@/middlewares/secure/rateLimit'
import { sanitizeInput } from '@/middlewares/secure/sanitizeInput.js'

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
// 🔰 Comando /start
// (este comando se desarrollará después)
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
// 🔰 Exportación para app.js (webhook)
// ====================================
const webhookCallback = bot.webhookCallback(
  `/telegraf/${bot.secretPathComponent()}`
)

export { bot, webhookCallback }
