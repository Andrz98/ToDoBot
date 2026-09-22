import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeBot, makeCtx } from '../../../support/telegram.js'

const h = vi.hoisted(() => ({ findById: vi.fn(), tz: vi.fn() }))
vi.mock('@/models/task.js', () => ({ Task: { findById: h.findById } }))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({ getUserTimezone: h.tz })
)

import { registerFieldEditActions } from '@/actions/editAction/fieldEditActions.js'

describe('/edit: periodicidad con botones', () => {
  let bot, ctx, task
  beforeEach(() => {
    task = {
      name: 'Pagar luz',
      description: 'urgente',
      reminderAt: new Date('2099-01-01T00:00:00Z'),
      frequency: 'daily'
    }
    h.findById.mockReset().mockResolvedValue(task)
    h.tz.mockReset().mockResolvedValue('Europe/Madrid')
    bot = makeFakeBot()
    registerFieldEditActions(bot)
    ctx = makeCtx({
      session: {
        flowType: 'edit',
        editing: { id: 't1', oldName: 'Pagar luz' },
        edits: {},
        menuMessageId: 5
      }
    })
  })

  it('abre la botonera marcando la periodicidad actual de la tarea', async () => {
    await bot.press('edit_freq', ctx)

    const [, id, , text, extra] = ctx.telegram.editMessageText.mock.calls[0]
    expect(id).toBe(5)
    expect(text).toContain('periodicidad')
    expect(
      extra.reply_markup.inline_keyboard
        .flat()
        .map((b) => [b.text, b.callback_data])
    ).toEqual([
      ['✅ Diario', 'edit_freq_daily'],
      ['Semanal', 'edit_freq_weekly'],
      ['Mensual', 'edit_freq_monthly'],
      ['Anual', 'edit_freq_yearly'],
      ['↩️ Volver', 'edit_back']
    ])
  })

  it('elegir una periodicidad la deja como cambio pendiente y vuelve al menú', async () => {
    await bot.press('edit_freq_weekly', ctx)

    expect(ctx.session.edits.frequency).toBe('weekly')
    const [, , , text] = ctx.telegram.editMessageText.mock.calls[0]
    expect(text).toContain('Nueva periodicidad')
    expect(text).toContain('Semanal')
  })

  it('volver sin elegir nada no deja cambios pendientes', async () => {
    await bot.press('edit_back', ctx)

    expect(ctx.session.edits.frequency).toBeUndefined()
    expect(ctx.telegram.editMessageText.mock.calls[0][3]).toContain(
      'Periodicidad: Diario'
    )
  })

  it('con el flujo caducado, el botón de periodicidad no hace nada', async () => {
    ctx.session.flowType = null

    await bot.press('edit_freq', ctx)

    expect(ctx.telegram.editMessageText).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Esta acción ya no está disponible.'
    )
  })
})
