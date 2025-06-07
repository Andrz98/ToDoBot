import { describe, it, expect, vi, beforeEach } from 'vitest'
import { editTask } from '@/controllers/taskControllers/editTask.js'
import { findUserTaskByName } from '@/helpers/userTaskBynameController/findUserTaskByName.js'

// Mock explícito del helper que usare para todas las pruebas
vi.mock('@/helpers/userTaskBynameController/findUserTaskByName.js', () => ({
  findUserTaskByName: vi.fn()
}))

// Creo el contexto para simular las pruebas de editTask
describe('editTask', () => {
  let ctx
  const userId = 12345

  beforeEach(() => {
    vi.clearAllMocks()
    ctx = {
      from: { id: userId },
      message: { text: '/edit Comprar pan - En la panadería nueva' },
      reply: vi.fn()
    }
  })

  // Parte 1: Debe poderse editar correctamente la tarea
  it('debe editar la descrición si se encuentra correctamente la tarea', async () => {
    const mockTask = {
      name: 'Comprar pan',
      description: 'En la panadería nueva',
      save: vi.fn()
    }

    // Simulo el helper para devolver la tarea
    findUserTaskByName.mockResolvedValue({ task: mockTask })

    // Llamo al sub-controller
    await editTask(ctx)

    // Afirmo que la lógica se comportó como se esperaba.
    expect(mockTask.description).toBe('En la panadería nueva')
    expect(mockTask.save).toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('👌🏽 Tarea editada')
  })

  // Parte 2: Responde con un error si el helper no encuentra la tarea
  it('debe responder con un error si el helper no encuentra la tarea', async () => {
    findUserTaskByName.mockResolvedValue({
      error: 'No se pudo encontrar la tarea'
    })

    await editTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith('No se pudo encontrar la tarea')
  })

  // Parte 5: Captura errores internos y responde con mensaje genérico
  it('debe capturar errores internos y responder con mensaje genérico', async () => {
    findUserTaskByName.mockRejectedValue(new Error('Fallo inesperado'))

    await editTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al editar la tarea. Intenta más tarde.'
    )
  })
})
