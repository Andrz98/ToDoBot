import './config/env.js'
import mongoose from 'mongoose'

import {
  webhookCallback,
  WEBHOOK_PATH,
  registerWebhook
} from './config/telegraf/telegraf.js'
import { createApp } from './config/express/createApp.js'
import { startReminderScheduler } from './services/schedulers/reminderScheduler.js'

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
    console.info('👾 Conectado a MongoDB correctamente')

    // ======================
    // 🔰 Inicializo Scheduler
    // ======================
    startReminderScheduler()

    // ==========================================
    // 🔰 Inicializo Express (webhook + ruta raíz)
    // ==========================================
    const app = createApp({ webhookPath: WEBHOOK_PATH, webhookCallback })

    // Sin webhook registrado el bot no recibe nada: mejor caer y que Render reinicie
    registerWebhook(domain)
      .then(() => {
        console.info(`🤖 Webhook activo en: ${domain}${WEBHOOK_PATH}`)
      })
      .catch((err) => {
        console.error('🦽 Error al registrar el webhook:', err.message)
        process.exit(1)
      })

    // =======================
    // 🔰 Levanto el servidor
    // =======================
    app.listen(port, () => {
      console.info(`🛫 Servidor escuchando en http://localhost:${port}`)
    })
  })
  .catch((err) => {
    console.error('🦽 Error al conectar a MongoDB:', err.message)
    process.exit(1)
  })
