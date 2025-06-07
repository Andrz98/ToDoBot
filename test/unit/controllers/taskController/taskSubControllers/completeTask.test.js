import { describe, it, beforeEach, expect, vi } from 'vitest'
import { completeTask } from '@/controllers/taskControllers/completeTask.js'
import { findUserTaskByName } from '@/helpers/userTaskBynameController/findUserTaskByName.js'

// Hago el Mock explícito del helper que se usa dentro de mi controller completeTask y que usaré para todas las pruebas.
vi.mock('@/helpers/userTaskBynameController/findUserTaskByName.js', () => ({
  findUserTaskByName: vi.fn()
}))

describe('completeTask', () => {
  let ctx
  const userId = 12345

  // Antes de cada test, restablecemos los mocks y creo el nuevo contexto simulado
  beforeEach(() => {
    vi.clearAllMocks()
    ctx = {
      from: { id: userId },
      message: { text: '/done Comprar pan' },
      reply: vi.fn()
    }
  })

  // Pate 1: Debe marcar como completada una tarea
  it('debe marcar una tarea como completada si se encuentra correctamente', async () => {
    // Creo la tarea simulada obtenida desde el helper
    const mockTask = {
      name: 'Comprar pan',
      completed: false,
      save: vi.fn()
    }

    // Simulo que el helper encuentra la tarea
    findUserTaskByName.mockResolvedValue({ task: mockTask })

    // Llamo al sub-controller
    await completeTask(ctx)

    // Afirmo que la lógica se comportó como se esperaba.
    expect(mockTask.completed).toBe(true)
    expect(mockTask.save).toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('👌🏽 Tarea completada')
  })

  // Parte 2: Cuando la tarea no se encuentra se rechaza y entonces devolvemos un mensaje de error
  it('debe responder con un mensaje si ocurre un error en el helper', async () => {
    // Simulo que el helper no encuentra el valor de la tarea
    findUserTaskByName.mockResolvedValue({
      error: '🤯 No se encontró ninguna tarea llamada "Comprar pan"'
    })

    await completeTask(ctx)

    // Afirmo que la lógica se comportó como se esperaba.
    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 No se encontró ninguna tarea llamada "Comprar pan"'
    )
  })

  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    // Simulo que el helper no encuentra el valor de la tarea
    findUserTaskByName.mockRejectedValue(new Error('Fallo inesperado'))

    await completeTask(ctx)

    // Afirmo que la lógica se comportó como se esperaba.
    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Algo salió mal al iniciar el flujo de completar tareas. Intenta más tarde.'
    )
  })
})
