import { describe, it, beforeEach, vi, expect } from 'vitest'
import { listTasks } from '@/controllers/taskControllers/listTask.js'
import { isUserAuthorized } from '@/helpers/userAuthorizedTaskController/isUserAuthorized.js'
import Task from '@/models/task.js'

// Creo el mock del helper que voy a utilizar en todas las partes
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: vi.fn()
}))

// Creo el mock para el modelo Task
vi.mock('@/models/task.js', () => ({
  default: {
    find: vi.fn()
  }
}))

describe('listTasks', () => {
  let ctx
  const userId = 12345

  beforeEach(() => {
    vi.clearAllMocks()
    ctx = {
      from: { id: userId },
      message: { text: '/list' },
      reply: vi.fn()
    }
  })

  // Parte 1: Debe rechazar si el usuario no esta autorizado
  it('debe rechazar si el usuario no esta autorizado', async () => {
    // Simulo que el usuario no tiene permisos
    isUserAuthorized.mockResolvedValue(false)

    // Llamo la función real de listTasks
    await listTasks(ctx)

    // Valido que la lógica llame correctamente a ctx.reply () con el mensaje adecuado
    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })

  // Parte 2: Debe mostrar un mensaje si el usuario no tiene tareas activas
  it('debe responder que no hay tareas activas en /list', async () => {
    // Simulo que el usuario tiene permisos
    isUserAuthorized.mockResolvedValue(true)

    // Simulo respuesta vacía
    Task.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    })

    // Llamo a la función real de listTasks
    await listTasks(ctx)

    // Respondo que el usuario no tiene tareas en pendientes en la lista
    expect(ctx.reply).toHaveBeenCalledWith('🤯 No tienes tareas activas.')
  })

  // Parte 3: Debe mostrar tareas si existen
  it('debe listar las tareas si existen en /list', async () => {
    // Simulo que el usuario si tiene permisos para /list
    isUserAuthorized.mockResolvedValue(true)

    // Simulo una lista de tareas activas del usuario
    Task.find.mockReturnValue({
      sort: vi
        .fn()
        .mockResolvedValue([
          { name: 'Comprar pan' },
          { name: 'Comprar ordenador' }
        ])
    })

    // llamo la acción real de listTasks
    await listTasks(ctx)

    expect(ctx.reply).toHaveBeenCalledWith('Aquí tienes la lista')
    expect(ctx.reply).toHaveBeenCalledWith(
      'Selecciona una tarea para ver sus detalles:',
      expect.any(Object)
    )
  })

  // Parte 4: Muestro un error genérico si algo falla
  it('debe capturar errores internos y responder con un mensaje genérico', async () => {
    // Simulo que el helper no encuentra el valor de la tarea
    isUserAuthorized.mockResolvedValue(true)

    // Simulo un fallo en task.find()
    Task.find.mockImplementation(() => {
      throw new Error('Fallo inesperado')
    })

    // Llamo la acción real de listTasks
    await listTasks(ctx)

    // Afirmo que la lógica se comportó como esperaba
    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al mostrar tus tareas. Intenta más tarde.'
    )
  })
})
