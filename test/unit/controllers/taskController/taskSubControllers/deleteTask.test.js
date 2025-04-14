import { vi, describe, it, expect, beforeEach } from 'vitest'
import { deleteTask } from '@/controllers/taskControllers/deleteTask'
import { findUserTaskByName } from '@/helpers/userTaskBynameController/findUserTaskByName'

// Mock del helper que se usa dentro de mi sub-controller y que usaré para todas las pruebas.
vi.mock('@/helpers/userTaskBynameController/findUserTaskByName.js', () => ({
  findUserTaskByName: vi.fn()
}))

// Creo el contexto para simular las pruebas de deleteTask
describe('deleteTask', () => {
  let ctx
  const userId = 12345

  // Antes de cada test, restablezco todos los mocks y creo el contexto simulado para deleteTask
  beforeEach(() => {
    vi.clearAllMocks()
    ctx = {
      from: { id: userId },
      message: { test: '/delete Comprar pan' },
      reply: vi.fn()
    }
  })

  // Parte 1: Eliminación exitosa de una tarea que ya existe
  it('debe eliminar la tarea si se encuentra correctamente', async () => {
    const mockTask = {
      name: 'Comprar pan',
      deleteOne: vi.fn()
    }

    findUserTaskByName.mockResolvedValue({ task: mockTask })

    await deleteTask(ctx)

    expect(mockTask.deleteOne).toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith(
      '🫡 Ojitooo eliminaste la tarea "Comprar pan". Ten cuidado y no la líes'
    )
  })

  // Parte 2: La tarea no se ha encontrado
  it('debe responder con un mensaje si ocurre un error en el helper', async () => {
    findUserTaskByName.mockResolvedValue({
      error: '🤯 No se encontró ninguna tarea llamada "Comprar pan"'
    })

    await deleteTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 No se encontró ninguna tarea llamada "Comprar pan"'
    )
  })

  // Parte 3: Captura de errores internos y responder con un mensaje genérico
  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    findUserTaskByName.mockRejectedValue(new Error('Fallo inesperado'))

    await deleteTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrio un error al eliminar la tarea. Intenta más tarde.'
    )
  })
})
