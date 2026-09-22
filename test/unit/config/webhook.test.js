import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'

vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = '123456:test-token'
  process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret_123'
})
vi.mock('@/middlewares/session/localSession.js', () => ({
  localSessionMiddleware: (ctx, next) => {
    ctx.session = {}
    return next()
  }
}))

import {
  bot,
  webhookCallback,
  WEBHOOK_PATH,
  registerWebhook
} from '@/config/telegraf/telegraf.js'
import { createApp } from '@/config/express/createApp.js'

const SECRET_HEADER = 'X-Telegram-Bot-Api-Secret-Token'
const update = { update_id: 1 }

describe('webhook de Telegram', () => {
  let app, handleUpdate
  beforeEach(() => {
    handleUpdate = vi
      .spyOn(bot, 'handleUpdate')
      .mockImplementation(async (_update, res) => {
        res.end()
      })
    app = createApp({ webhookPath: WEBHOOK_PATH, webhookCallback })
  })
  afterEach(() => vi.restoreAllMocks())

  it('rechaza peticiones sin secret token', async () => {
    const res = await request(app).post(WEBHOOK_PATH).send(update)

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(handleUpdate).not.toHaveBeenCalled()
  })

  it('rechaza un secret token incorrecto', async () => {
    const res = await request(app)
      .post(WEBHOOK_PATH)
      .set(SECRET_HEADER, 'otro-secreto')
      .send(update)

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(handleUpdate).not.toHaveBeenCalled()
  })

  it('procesa la actualización cuando el secret token es correcto', async () => {
    const res = await request(app)
      .post(WEBHOOK_PATH)
      .set(SECRET_HEADER, 'test-secret_123')
      .send(update)

    expect(res.status).toBe(200)
    expect(handleUpdate).toHaveBeenCalledWith(update, expect.anything())
  })

  it('GET / responde 200 sin anunciar Express', async () => {
    const res = await request(app).get('/')

    expect(res.status).toBe(200)
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})

describe('registerWebhook', () => {
  it('registra la URL del webhook con el secret_token', async () => {
    const setWebhook = vi
      .spyOn(bot.telegram, 'setWebhook')
      .mockResolvedValue(true)

    await registerWebhook('https://bot.example.com')

    expect(setWebhook).toHaveBeenCalledWith(
      `https://bot.example.com${WEBHOOK_PATH}`,
      { secret_token: 'test-secret_123' }
    )
  })
})

describe('configuración del secret', () => {
  const load = () => {
    vi.resetModules()
    mongoose.deleteModel(/.*/) // mongoose no se reinicia: evita "Cannot overwrite model"
    return import('@/config/telegraf/telegraf.js')
  }
  afterEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret_123'
  })

  it('sin TELEGRAM_WEBHOOK_SECRET el arranque falla', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET

    await expect(load()).rejects.toThrow('TELEGRAM_WEBHOOK_SECRET')
  })

  it('un secreto con caracteres no admitidos por Telegram falla', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'no valido!'

    await expect(load()).rejects.toThrow('TELEGRAM_WEBHOOK_SECRET')
  })
})
