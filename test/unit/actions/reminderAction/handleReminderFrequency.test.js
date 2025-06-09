import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    callbackQuery: { data: 'setReminder::42' },
    answerCbQuery: vi.fn(),
    editMessageText: vi.fn(),
    reply: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ctx.editMessageText.mockReset()
    ctx.reply.mockReset()
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

    expect(buildFrequencyMenu).toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalled()
    expect(safeEditMessageReplyMarkup).toHaveBeenCalledWith(ctx, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Diario', callback_data: 'saveReminder::42::daily' }],
          [{ text: 'Semanal', callback_data: 'saveReminder::42::weekly' }]
        ]
      }
    })
  })

  it('edits the message text using the menu text', async () => {
    Task.findById.mockResolvedValue({ _id: '42', name: 'Task' })
    buildFrequencyMenu.mockReturnValue({
      text: 'msg',
      markup: { reply_markup: { inline_keyboard: [] } }
    })

    await handleReminderFrequency(ctx)

    expect(ctx.editMessageText).toHaveBeenCalledWith('msg', {
      reply_markup: { inline_keyboard: [] }
    })
  })
})
