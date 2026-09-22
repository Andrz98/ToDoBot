import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveReminderAction } from '@/actions/reminderAction/saveReminderAction.js'
import { findTask } from '@/helpers/tasks/findTask.js'
import { flashReply } from '@/utils/delayUtils/flashReply.js'

vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: vi.fn() }))
vi.mock('@/utils/delayUtils/flashReply.js', () => ({
  flashReply: vi.fn()
}))

describe('saveReminderAction', () => {
  const ctx = {
    from: { id: 7 },
    callbackQuery: { data: 'saveReminder::100::weekly' },
    answerCbQuery: vi.fn(),
    editMessageReplyMarkup: vi.fn().mockResolvedValue(true),
    session: {}
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    vi.clearAllMocks()
    ctx.session = { flowType: 'reminder', menuMessageId: 1 }
    vi.spyOn(console, 'error').mockImplementation(() => {})
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
    findTask.mockResolvedValue(task)

    await saveReminderAction(ctx)

    expect(findTask).toHaveBeenCalledWith(7, { id: '100' })
    expect(task.frequency).toBe('weekly')
    expect(
      task.reminderAt.getTime() - new Date('2024-01-01T00:00:00Z').getTime()
    ).toBe(7 * 24 * 60 * 60 * 1000)
    expect(task.alertsSent).toEqual([])
    expect(saveMock).toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalled()
    expect(flashReply).toHaveBeenCalledWith(
      ctx,
      expect.stringContaining('My task'),
      {},
      2500
    )
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.menuMessageId).toBeUndefined()
    expect(ctx.editMessageReplyMarkup).toHaveBeenCalled()
  })

  it('error externo simulado al guardar: limpia flowType en vez de dejarlo colgado', async () => {
    const task = {
      _id: '100',
      name: 'My task',
      frequency: 'daily',
      reminderAt: new Date('2023-12-31T00:00:00Z'),
      alertsSent: [],
      save: vi.fn().mockRejectedValue(new Error('Fallo de Mongo'))
    }
    findTask.mockResolvedValue(task)

    await expect(saveReminderAction(ctx)).resolves.not.toThrow()

    expect(ctx.session.flowType).toBeNull()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
  })
})
