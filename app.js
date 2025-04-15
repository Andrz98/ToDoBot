import express from 'express'
import 'dotenv/config'
import mongoose from 'mongoose'

import { bot, webhookCallback } from './config/telegraf/telegraf.js'
import { errorHandler } from './middlewares/errors/errorHandler.js'

// ====================================
// 🔰 Verifico .env
// ====================================
const mongoURI = process.env.MONGO_URI
const port = process.env.PORT || 3000
const domain = process.env.WEBHOOK_DOMAIN

if (!mongoURI) {
  throw new Error('🪧 MONGO_URI no está definido en el archivo .env')
}

if (!domain) {
  throw new Error('🪧 WEBHOOK_DOMAIN no está definido en el archivo .env')
}

// =====================
// 🔰 Conecto a MongoDB
// =====================
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('👾 Conectado a MongoDB correctamente')

    // ======================
    // 🔰 Inicializo Express
    // ======================
    const app = express()

    // =======================
    // 🔰 Webhook de Telegraf
    // =======================
    const path = `/telegraf/${bot.secretPathComponent()}`
    app.use(path, webhookCallback)
    bot.telegram.setWebhook(`${domain}${path}`)
    console.log(`🤖 Webhook activo en: ${domain}${path}`)

    // =======================
    // 🔰 Middleware de errores
    // =======================
    app.use(errorHandler)

    // =======================
    // 🔰 Levanto el servidor
    // =======================
    app.listen(port, () => {
      console.log(`🛫 Servidor escuchando en http://localhost:${port}`)
    })
  })
  .catch((err) => {
    console.error('🦽 Error al conectar a MongoDB:', err.message)
    process.exit(1)
  })
