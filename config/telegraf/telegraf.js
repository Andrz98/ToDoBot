import 'dotenv/config'
import { Telegraf } from 'telegraf'

// Me aseguro que el token exista
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('🪧 TELEGRAM_BOT_TOKEN no está definido en el archivo .env')
}

// Creo una instacia con del bot con el Token
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
