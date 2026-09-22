import { describe, it, expect, vi } from 'vitest'
import { flowGuard } from '@/middlewares/flowControl/flowGuard.js'

const run = async (session, extra = {}) => {
  const ctx = { session, reply: vi.fn().mockResolvedValue(undefined), ...extra }
  const next = vi.fn().mockResolvedValue(undefined)
  await flowGuard(ctx, next)
  return { ctx, next }
}

describe('flowGuard', () => {
  it('sin flujo activo deja pasar', async () => {
    const { next } = await run({}, { message: { text: 'hola' } })
    expect(next).toHaveBeenCalled()
  })

  it('flow_reset siempre pasa', async () => {
    const { next } = await run(
      { flowType: 'delete' },
      { callbackQuery: { data: 'flow_reset' } }
    )
    expect(next).toHaveBeenCalled()
  })

  it('un comando nuevo inicia otro flujo aunque haya uno activo', async () => {
    const { next } = await run(
      { flowType: 'delete' },
      { message: { text: '/list' } }
    )
    expect(next).toHaveBeenCalled()
  })

  it('con flujo clear permite los botones clear_confirm_*', async () => {
    const { ctx, next } = await run(
      { flowType: 'clear' },
      { callbackQuery: { data: 'clear_confirm_abc:yes' } }
    )
    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('show_task_* nunca se bloquea, sea cual sea el flujo activo', async () => {
    const { ctx, next } = await run(
      { flowType: 'delete' },
      { callbackQuery: { data: 'show_task_abc' } }
    )
    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('bloquea callbacks ajenos al flujo activo', async () => {
    const { ctx, next } = await run(
      { flowType: 'delete' },
      { callbackQuery: { data: 'complete_select:1' } }
    )
    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalled()
  })

  it('bloquea texto libre si no se espera ningún dato', async () => {
    const { ctx, next } = await run(
      { flowType: 'delete' },
      { message: { text: 'hola' } }
    )
    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply.mock.calls[0][0]).toContain('/delete')
  })

  it('permite texto libre cuando se espera un dato', async () => {
    const { next } = await run(
      { flowType: 'add', awaiting: 'add_name' },
      { message: { text: 'Pagar luz' } }
    )
    expect(next).toHaveBeenCalled()
  })

  it('un flujo con interfaz caducada (10 min sin interacción) se libera solo', async () => {
    const { ctx, next } = await run(
      { flowType: 'delete', flowExpiresAt: Date.now() - 1 },
      { message: { text: 'hola' } }
    )

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
    expect(ctx.session.flowType).toBeNull()
    expect(ctx.session.awaiting).toBeNull()
  })

  it('un flujo todavía dentro de su ventana sigue bloqueando como siempre', async () => {
    const { ctx, next } = await run(
      { flowType: 'delete', flowExpiresAt: Date.now() + 60_000 },
      { message: { text: 'hola' } }
    )

    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalled()
    expect(ctx.session.flowType).toBe('delete')
  })

  it('sin flowExpiresAt (sesión de antes de este cambio) no expira solo por eso', async () => {
    const { ctx, next } = await run(
      { flowType: 'delete' },
      { message: { text: 'hola' } }
    )

    expect(next).not.toHaveBeenCalled()
    expect(ctx.session.flowType).toBe('delete')
  })
})
