import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveReminderAction } from '@/actions/reminderAction/saveReminderAction.js'
import { findTask } from '@/helpers/tasks/findTask.js'

vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: vi.fn() }))

describe('saveReminderAction', () => {
  const ctx = {
    from: { id: 7 },
    chat: { id: 99 },
    callbackQuery: {
      data: 'saveReminder::100::weekly',
      message: { message_id: 1 }
    },
    answerCbQuery: vi.fn(),
    editMessageText: vi.fn().mockResolvedValue(true),
    telegram: { deleteMessage: vi.fn().mockResolvedValue(true) },
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
    // El teclado de frecuencia se sustituye por el resultado (ya no es pulsable)
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('My task'),
      expect.objectContaining({ reply_markup: { inline_keyboard: [] } })
    )
    expect(ctx.editMessageText.mock.calls[0][0]).toContain('Semanal')
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.menuMessageId).toBeUndefined()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(99, 1)
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
