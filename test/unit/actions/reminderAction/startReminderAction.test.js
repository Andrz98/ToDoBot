import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startReminderAction } from '@/actions/reminderAction/startReminderAction.js'
import { findAllTasks } from '@/helpers/tasks/findAllTasks.js'

vi.mock('@/helpers/tasks/findAllTasks.js', () => ({
  findAllTasks: vi.fn()
}))

describe('startReminderAction', () => {
  const ctx = {
    from: { id: 1 },
    chat: { id: 5 },
    reply: vi.fn(() => ({ message_id: 99 })),
    telegram: { deleteMessage: vi.fn().mockResolvedValue(true) },
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
            [
              {
                text: 'Task 2 \u2014 Sin recordatorio',
                callback_data: 'setReminder::2'
              }
            ],
            [
              {
                text: '✔️ Finalizar acción',
                callback_data: 'reminder_cancel',
                hide: false
              }
            ]
          ]
        }
      }
    )
    expect(ctx.session.flowType).toBe('reminder')
  })

  it('sin tareas activas: avisa con atajo a crear una y libera el flowType', async () => {
    findAllTasks.mockResolvedValue([])

    await startReminderAction(ctx)

    const [text, extra] = ctx.reply.mock.calls[0]
    expect(text).toBe(
      '📭 No tienes tareas activas para configurar recordatorios.'
    )
    expect(extra.reply_markup.inline_keyboard[0][0].callback_data).toBe(
      'menu_add'
    )
    expect(ctx.session.flowType).toBeNull()
  })

  it('error externo simulado: limpia flowType en vez de dejarlo colgado', async () => {
    findAllTasks.mockRejectedValue(new Error('Fallo de Mongo'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(startReminderAction(ctx)).resolves.not.toThrow()

    expect(ctx.session.flowType).toBeNull()
  })
})
