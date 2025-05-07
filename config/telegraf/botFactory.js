import { Telegraf, Telegram } from 'telegraf'
import https from 'https'

// Agente con keepAlive para todas las llamadas HTTP a Telegram
const agent = new https.Agent({ keepAlive: true })

/**
 * Fabrica un bot de Telegraf con cliente HTTP reutilizable.
 * @param {string} token – Tu BOT_TOKEN
 * @returns {import('telegraf').Telegraf}
 */
export function createBot(token) {
  const bot = new Telegraf(token)
  // Sobrescribimos el cliente HTTP para usar nuestro agent
  bot.telegram = new Telegram(token, {
    apiRoot: 'https://api.telegram.org',
    agent,
    webhookReply: false,
    ...bot.telegram.options
  })
  return bot
}
