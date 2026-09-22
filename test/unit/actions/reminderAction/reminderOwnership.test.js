import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ findTask: vi.fn(), findById: vi.fn() }))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: vi.fn().mockResolvedValue('Europe/Madrid') })
)

import { handleReminderFrequency } from '@/events/reminderEvent/handleReminderFrequency.js'
import { saveReminderAction } from '@/actions/reminderAction/saveReminderAction.js'

const ctxWith = (data) =>
  makeCtx({ callbackQuery: { data, message: { message_id: 5 } } })

describe('recordatorios: solo sobre tareas propias', () => {
  beforeEach(() => {
    h.findTask.mockReset()
    h.findById.mockReset()
  })

  it('setReminder busca la tarea del usuario que pulsa', async () => {
    h.findTask.mockResolvedValue({ name: 'T' })
    const ctx = ctxWith('setReminder::abc123')

    await handleReminderFrequency(ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
  })

  it('setReminder con tarea ajena responde "no encontrada"', async () => {
    h.findTask.mockResolvedValue(null)
    const ctx = ctxWith('setReminder::abc123')

    await handleReminderFrequency(ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.', {
      show_alert: true
    })
    expect(ctx.telegram.editMessageText).not.toHaveBeenCalled()
  })

  it('saveReminder busca la tarea del usuario y la guarda', async () => {
    const task = { name: 'T', save: vi.fn().mockResolvedValue(undefined) }
    h.findTask.mockResolvedValue(task)
    const ctx = ctxWith('saveReminder::abc123::weekly')

    await saveReminderAction(ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: 'abc123' })
    expect(h.findById).not.toHaveBeenCalled()
    expect(task.frequency).toBe('weekly')
    expect(task.save).toHaveBeenCalled()
  })

  it('saveReminder con tarea ajena no modifica nada', async () => {
    h.findTask.mockResolvedValue(null)
    const ctx = ctxWith('saveReminder::abc123::weekly')

    await saveReminderAction(ctx)

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Tarea no encontrada.')
  })
})
