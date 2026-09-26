import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ findTask: vi.fn() }))
vi.mock('@/helpers/tasks/findTask.js', () => ({ findTask: h.findTask }))

import { handleReminderFrequency } from '@/events/reminderEvent/handleReminderFrequency.js'

describe('handleReminderFrequency', () => {
  let ctx
  beforeEach(() => {
    h.findTask.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ctx = makeCtx({
      callbackQuery: { data: 'setReminder::42', message: { message_id: 10 } },
      session: { flowType: 'reminder', menuMessageId: 10 }
    })
  })

  it('muestra la botonera de periodicidad en el mismo mensaje, marcando la actual', async () => {
    h.findTask.mockResolvedValue({
      _id: '42',
      name: 'Task',
      frequency: 'weekly'
    })

    await handleReminderFrequency(ctx)

    expect(h.findTask).toHaveBeenCalledWith(7, { id: '42' })
    const [, messageId, , text, extra] =
      ctx.telegram.editMessageText.mock.calls[0]
    expect(messageId).toBe(10)
    expect(text).toContain('periodicidad')
    expect(
      extra.reply_markup.inline_keyboard
        .flat()
        .map((b) => [b.text, b.callback_data])
    ).toEqual([
      ['Diario', 'saveReminder::42::daily'],
      ['✅ Semanal', 'saveReminder::42::weekly'],
      ['Mensual', 'saveReminder::42::monthly'],
      ['Anual', 'saveReminder::42::yearly'],
      ['✔️ Finalizar acción', 'reminder_cancel']
    ])
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('si no puede editar, envía la botonera en un mensaje nuevo (nunca la pierde)', async () => {
    h.findTask.mockResolvedValue({
      _id: '42',
      name: 'Task',
      frequency: 'daily'
    })
    ctx.telegram.editMessageText.mockRejectedValue(new Error('cannot edit'))

    await handleReminderFrequency(ctx)

    const [, extra] = ctx.reply.mock.calls[0]
    expect(extra.reply_markup.inline_keyboard).toHaveLength(5)
  })

  it('error externo simulado: limpia flowType en vez de dejarlo colgado', async () => {
    h.findTask.mockRejectedValue(new Error('Fallo de Mongo'))

    await expect(handleReminderFrequency(ctx)).resolves.not.toThrow()

    expect(ctx.session.flowType).toBeNull()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error. Intenta de nuevo más tarde.',
      { show_alert: true }
    )
  })
})
