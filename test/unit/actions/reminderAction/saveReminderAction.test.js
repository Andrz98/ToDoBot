import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveReminderAction } from '@/actions/reminderAction/saveReminderAction.js'
import { Task } from '@/models/task.js'
import { flashReply } from '@/utils/delayUtils/flashReply.js'
import { safeAnswerCbQuery } from '@/utils/retryUtils/safeAnswerCbQuery.js'

vi.mock('@/models/task.js', () => ({
  Task: { findById: vi.fn() }
}))

vi.mock('@/utils/delayUtils/flashReply.js', () => ({
  flashReply: vi.fn()
}))

vi.mock('@/utils/retryUtils/safeAnswerCbQuery.js', () => ({
  safeAnswerCbQuery: vi.fn()
}))

describe('saveReminderAction', () => {
  const ctx = { callbackQuery: { data: 'saveReminder::100::weekly' }, answerCbQuery: vi.fn() }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates frequency and reminderAt on the chosen task', async () => {
    const saveMock = vi.fn()
    const task = {
      _id: '100',
      name: 'My task',
      frequency: 'daily',
      reminderAt: new Date('2023-12-31T00:00:00Z'),
      alertsSent: ['72h'],
      save: saveMock
    }
    Task.findById.mockResolvedValue(task)

    await saveReminderAction(ctx)

    expect(task.frequency).toBe('weekly')
    expect(task.reminderAt.getTime() - new Date('2024-01-01T00:00:00Z').getTime()).toBe(
      7 * 24 * 60 * 60 * 1000
    )
    expect(task.alertsSent).toEqual([])
    expect(saveMock).toHaveBeenCalled()
    expect(safeAnswerCbQuery).toHaveBeenCalledWith(ctx)
    expect(flashReply).toHaveBeenCalledWith(
      ctx,
      expect.stringContaining('My task'),
      {},
      2500
    )
  })
})
