import { describe, it, expect } from 'vitest'
import { updateTaskFields } from '@/helpers/taskHelpers/edit/updateTaskFields.js'

const makeTask = () => ({
  name: 'Pagar luz',
  description: 'urgente',
  frequency: 'daily',
  reminderAt: new Date('2099-01-01T00:00:00Z'),
  alertsSent: ['24h']
})

describe('updateTaskFields', () => {
  it('con otra fecha, las alertas ya enviadas vuelven a contar desde cero', () => {
    const task = makeTask()

    updateTaskFields(
      task,
      { date: new Date('2099-02-01T00:00:00Z') },
      'Europe/Madrid'
    )

    expect(task.alertsSent).toEqual([])
  })

  it('cambiar solo el nombre no toca las alertas', () => {
    const task = makeTask()

    updateTaskFields(task, { newName: 'Pagar gas' }, 'Europe/Madrid')

    expect(task.alertsSent).toEqual(['24h'])
  })
})
