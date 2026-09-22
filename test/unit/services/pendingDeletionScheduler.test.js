import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  find: vi.fn(),
  deleteOne: vi.fn().mockResolvedValue(undefined),
  recover: vi.fn().mockResolvedValue(undefined),
  cronJobs: []
}))
vi.mock('node-cron', () => ({
  default: { schedule: (_expr, fn) => h.cronJobs.push(fn) }
}))
vi.mock('@/models/pendingDeletion.js', () => ({
  PendingDeletion: { find: h.find, deleteOne: h.deleteOne }
}))
vi.mock('@/utils/telegramUtils/messageLifecycle.js', () => ({
  recoverPendingDeletions: h.recover
}))

import { startPendingDeletionScheduler } from '@/services/schedulers/pendingDeletionScheduler.js'

describe('startPendingDeletionScheduler', () => {
  const bot = { telegram: { deleteMessage: vi.fn().mockResolvedValue(true) } }

  beforeEach(() => {
    h.cronJobs.length = 0
    h.find.mockReset()
    h.deleteOne.mockClear()
    h.recover.mockClear()
    bot.telegram.deleteMessage.mockClear()
  })

  it('al arrancar, recupera los borrados pendientes de antes de caer', async () => {
    h.find.mockReturnValue({ lean: () => Promise.resolve([]) })

    await startPendingDeletionScheduler(bot)

    expect(h.recover).toHaveBeenCalledWith(bot)
  })

  it('programa un barrido periódico que limpia lo vencido que se haya escapado', async () => {
    h.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          { chatId: 1, messageId: 10 },
          { chatId: 2, messageId: 20 }
        ])
    })

    await startPendingDeletionScheduler(bot)
    await h.cronJobs[0]()

    expect(bot.telegram.deleteMessage).toHaveBeenCalledWith(1, 10)
    expect(bot.telegram.deleteMessage).toHaveBeenCalledWith(2, 20)
    expect(h.deleteOne).toHaveBeenCalledWith({ chatId: 1, messageId: 10 })
    expect(h.deleteOne).toHaveBeenCalledWith({ chatId: 2, messageId: 20 })
  })

  it('un fallo al barrer no tira el proceso', async () => {
    h.find.mockReturnValue({
      lean: () => Promise.reject(new Error('Mongo caído'))
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await startPendingDeletionScheduler(bot)

    await expect(h.cronJobs[0]()).resolves.toBeUndefined()
  })
})
