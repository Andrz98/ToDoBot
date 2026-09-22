import { describe, it, expect } from 'vitest'
import { buildEditMenu } from '@/helpers/taskHelpers/edit/interactiveFlowEdit.js'

const task = (extra = {}) => ({
  name: 'Pagar luz',
  description: 'urgente',
  reminderAt: new Date('2099-12-25T15:00:00Z'),
  ...extra
})

describe('buildEditMenu', () => {
  it('muestra nombre, descripción y fecha en la zona del usuario', () => {
    const { text } = buildEditMenu(task(), 'America/Bogota')

    expect(text).toContain('Nombre: Pagar luz')
    expect(text).toContain('Descripción: urgente')
    expect(text).toContain('10:00') // 15:00Z en Bogotá
  })

  it('escapa el HTML de nombre y descripción (el menú se envía con parse_mode HTML)', () => {
    const { text } = buildEditMenu(
      task({ name: 'a<b>&', description: 'x <i>y</i>' }),
      'Europe/Madrid'
    )

    expect(text).toContain('Nombre: a&lt;b&gt;&amp;')
    expect(text).toContain('Descripción: x &lt;i&gt;y&lt;/i&gt;')
  })

  it('sin descripción ni fecha usa los textos por defecto', () => {
    const { text } = buildEditMenu(
      task({ description: undefined, reminderAt: undefined }),
      'Europe/Madrid'
    )

    expect(text).toContain('(sin descripción)')
    expect(text).toContain('(sin fecha)')
  })

  it('solo ofrece "Guardar" cuando hay cambios pendientes', () => {
    const labels = (hasEdits) =>
      buildEditMenu(task(), 'Europe/Madrid', hasEdits)
        .markup.reply_markup.inline_keyboard.flat()
        .map((b) => b.text)

    expect(labels(false)).toEqual(['Nombre', 'Descripción', 'Fecha'])
    expect(labels(true)).toContain('Guardar')
  })
})
