import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  findTask: vi.fn(),
  auth: vi.fn(),
  tz: vi.fn()
}))
vi.mock('@/models/task.js', () => ({
  Task: { findOneAndUpdate: h.findOneAndUpdate }
}))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)

import { registerAlertActions } from '@/actions/reminderAction/alertActions.js'

const NOW = new Date('2099-01-01T00:00:00Z').getTime()
const MIN = 60 * 1000
const ID = '0123456789abcdef01234567'

describe('botones del aviso de recordatorio', () => {
  let bot, ctx
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    Object.values(h).forEach((fn) => fn.mockReset())
    h.auth.mockResolvedValue(true)
    h.tz.mockResolvedValue('Europe/Madrid')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    bot = makeFakeBot()
    ctx = makeCtx() // el aviso pulsado es el mensaje 5
    registerAlertActions(bot)
  })
  afterEach(() => vi.useRealTimers())

  describe('✅ Hecho', () => {
    it('completa solo una tarea del propio usuario y retira el aviso', async () => {
      h.findOneAndUpdate.mockResolvedValue({ _id: ID })

      await bot.press(`rem_done::${ID}`, ctx)

      expect(h.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: ID, userId: 7 },
        { completed: true }
      )
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Tarea completada.', {})
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 5)
    })

    it('tarea ya borrada o ajena: avisa y retira igualmente el aviso', async () => {
      h.findOneAndUpdate.mockResolvedValue(null)

      await bot.press(`rem_done::${ID}`, ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {})
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 5)
    })
  })

  describe('aplazar', () => {
    const snoozable = (reminderAt) => {
      const task = {
        reminderAt: new Date(reminderAt),
        alertsSent: ['24h', '1h'],
        reminderMessageId: 5,
        save: vi.fn().mockResolvedValue(undefined)
      }
      h.findTask.mockResolvedValue(task)
      return task
    }

    it('+1 h mueve la fecha de la tarea, reinicia sus alertas y retira el aviso', async () => {
      const task = snoozable(NOW + 10 * MIN)

      await bot.press(`rem_snooze::${ID}::1h`, ctx)

      expect(h.findTask).toHaveBeenCalledWith(7, { id: ID })
      expect(task.reminderAt.getTime()).toBe(NOW + 70 * MIN)
      expect(task.alertsSent).toEqual([])
      expect(task.reminderMessageId).toBeUndefined()
      expect(task.save).toHaveBeenCalled()
      expect(ctx.answerCbQuery.mock.calls[0][0]).toContain('Aplazada')
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 5)
    })

    it('+1 día suma 24 h', async () => {
      const task = snoozable(NOW + 10 * MIN)

      await bot.press(`rem_snooze::${ID}::1d`, ctx)

      expect(task.reminderAt.getTime()).toBe(NOW + 10 * MIN + 24 * 60 * MIN)
    })

    it('si la fecha ya pasó, cuenta desde ahora (nunca queda en el pasado)', async () => {
      const task = snoozable(NOW - 3 * 60 * MIN)

      await bot.press(`rem_snooze::${ID}::1h`, ctx)

      expect(task.reminderAt.getTime()).toBe(NOW + 60 * MIN)
    })

    it('tarea ya borrada o ajena: avisa y retira el aviso sin guardar nada', async () => {
      h.findTask.mockResolvedValue(null)

      await bot.press(`rem_snooze::${ID}::1h`, ctx)

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {})
      expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(7, 5)
    })

    it('un id o un plazo inválidos no llegan a ningún handler', async () => {
      await expect(bot.press('rem_snooze::xyz::1h', ctx)).rejects.toThrow()
      await expect(bot.press(`rem_snooze::${ID}::9d`, ctx)).rejects.toThrow()
    })
  })

  it('usuario desautorizado: no toca la tarea ni retira el aviso', async () => {
    h.auth.mockResolvedValue(false)

    await bot.press(`rem_done::${ID}`, ctx)

    expect(h.findOneAndUpdate).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.',
      { show_alert: true }
    )
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
  })

  it('error de BD: avisa y conserva el aviso para reintentar', async () => {
    h.findOneAndUpdate.mockRejectedValue(new Error('Fallo de Mongo'))

    await bot.press(`rem_done::${ID}`, ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
    expect(ctx.telegram.deleteMessage).not.toHaveBeenCalled()
  })
})
