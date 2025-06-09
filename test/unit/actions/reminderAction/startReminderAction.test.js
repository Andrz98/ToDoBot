import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startReminderAction } from '@/actions/reminderAction/startReminderAction.js'
import { getActiveTasksByUser } from '@/helpers/tasks/common/taskSelection.js'

vi.mock('@/helpers/tasks/common/taskSelection.js', () => ({
  getActiveTasksByUser: vi.fn()
}))

describe('startReminderAction', () => {
  const ctx = { from: { id: 1 }, reply: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists tasks with current frequency labels', async () => {
    const now = new Date()
    getActiveTasksByUser.mockResolvedValue([
      { _id: '1', name: 'Task 1', reminderAt: now, frequency: 'daily' },
      { _id: '2', name: 'Task 2', reminderAt: null, frequency: 'weekly' }
    ])

    await startReminderAction(ctx)

    expect(getActiveTasksByUser).toHaveBeenCalledWith(1)
    expect(ctx.reply).toHaveBeenCalledWith(
      'Selecciona una tarea para configurar su recordatorio:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Task 1 \u2014 Diario', callback_data: 'setReminder::1' }],
            [{ text: 'Task 2 \u2014 Sin recordatorio', callback_data: 'setReminder::2' }]
          ]
        }
      }
    )
  })
})
