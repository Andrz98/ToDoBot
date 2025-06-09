import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startReminderAction } from '@/actions/reminderAction/startReminderAction.js'
import { findAllTasks } from '@/helpers/tasks/findAllTasks.js'

vi.mock('@/helpers/tasks/findAllTasks.js', () => ({
  findAllTasks: vi.fn()
}))

describe('startReminderAction', () => {
  const ctx = {
    from: { id: 1 },
    reply: vi.fn(() => ({ message_id: 99 })),
    session: {}
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists tasks with current frequency labels', async () => {
    const now = new Date()
    findAllTasks.mockResolvedValue([
      { _id: '1', name: 'Task 1', reminderAt: now, frequency: 'daily' },
      { _id: '2', name: 'Task 2', reminderAt: null, frequency: 'weekly' }
    ])

    await startReminderAction(ctx)

    expect(findAllTasks).toHaveBeenCalledWith(1)
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
    expect(ctx.session.flowType).toBe('reminder')
    expect(ctx.session.menuMessageId).toBeDefined()
  })
})
