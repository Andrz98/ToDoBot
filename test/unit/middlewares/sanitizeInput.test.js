import { describe, it, expect, vi } from 'vitest'
import { sanitizeInput } from '@/middlewares/secure/sanitizeInput.js'

const run = async (text) => {
  const ctx = { message: text === undefined ? {} : { text }, reply: vi.fn() }
  const next = vi.fn()
  await sanitizeInput(ctx, next)
  return { ctx, next }
}

describe('sanitizeInput', () => {
  it('deja pasar texto normal', async () => {
    const { next } = await run('comprar leche')
    expect(next).toHaveBeenCalled()
  })

  it('rechaza texto vacío o solo espacios', async () => {
    const { ctx, next } = await run('   ')
    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalled()
  })

  it('rechaza <script> en minúsculas (caso ya cubierto antes)', async () => {
    const { next } = await run('hola <script>alert(1)</script>')
    expect(next).not.toHaveBeenCalled()
  })

  it('rechaza <SCRIPT> en mayúsculas o con atributos (antes se colaba)', async () => {
    expect((await run('<SCRIPT>x</SCRIPT>')).next).not.toHaveBeenCalled()
    expect((await run('<script src="x.js">')).next).not.toHaveBeenCalled()
  })

  it('sin mensaje de texto (p. ej. un callback) deja pasar sin tocarlo', async () => {
    const { next } = await run(undefined)
    expect(next).toHaveBeenCalled()
  })
})
