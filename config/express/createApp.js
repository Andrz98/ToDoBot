import express from 'express'
import { debugLog } from '../../utils/logUtils/debugLog.js'

/**
 * Crea la app Express: webhook de Telegram + ruta raíz para mantener Render activo.
 *
 * @param {object} options
 * @param {string} options.webhookPath - Ruta donde Telegram entrega las actualizaciones
 * @param {Function} options.webhookCallback - Handler de Telegraf (valida path y secret token)
 */
export const createApp = ({ webhookPath, webhookCallback }) => {
  const app = express()
  app.disable('x-powered-by')

  app.post(webhookPath, express.json(), (req, res, next) => {
    debugLog('📩 Petición recibida en webhook') // Necesito forzar a render a mostrarme
    webhookCallback(req, res, next)
  })

  app.get('/', (req, res) => {
    res
      .status(200)
      .send('🤖 TuttoFatto está despierto y funcionando correctamente.')
  })

  return app
}
