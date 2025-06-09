import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleReminderFrequency } from '@/events/reminderEvent/handleReminderFrequency.js'
import { Task } from '@/models/task.js'
import { buildFrequencyMenu } from '@/helpers/frequency/flowFrequency/interactiveFlowFrequency.js'
import { safeEditMessageReplyMarkup } from '@/utils/retryUtils/safeEditMessageReplyMarkup.js'

vi.mock('@/models/task.js', () => ({
  Task: { findById: vi.fn() }
}))

vi.mock('@/helpers/frequency/flowFrequency/interactiveFlowFrequency.js', () => ({
  buildFrequencyMenu: vi.fn()
}))

vi.mock('@/utils/retryUtils/safeEditMessageReplyMarkup.js', () => ({
  safeEditMessageReplyMarkup: vi.fn()
}))

describe('handleReminderFrequency', () => {
  const ctx = {
    callbackQuery: {
      data: 'setReminder::42',
      message: { message_id: 10 }
    },
    chat: { id: 5 },
    telegram: { editMessageText: vi.fn(() => Promise.reject(new Error('fail'))) },
    answerCbQuery: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the keyboard returned by buildFrequencyMenu', async () => {
    Task.findById.mockResolvedValue({ _id: '42', name: 'Task' })
    buildFrequencyMenu.mockReturnValue({
      text: 'texto',
      markup: {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Diario', callback_data: 'add_freq_daily' }],
            [{ text: 'Semanal', callback_data: 'add_freq_weekly' }]
          ]
        }
      }
    })

    await handleReminderFrequency(ctx)

    const expectedMarkup = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Diario', callback_data: 'saveReminder::42::daily' }],
          [{ text: 'Semanal', callback_data: 'saveReminder::42::weekly' }]
        ]
      }
    }

    expect(buildFrequencyMenu).toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalled()
    expect(ctx.telegram.editMessageText).toHaveBeenCalledWith(
      5,
      10,
      undefined,
      'texto',
      expectedMarkup
    )
    expect(safeEditMessageReplyMarkup).toHaveBeenCalledWith(ctx, expectedMarkup)
  })
})
