import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addTask } from '@/controllers/taskControllers/addTask.js'
import Task from '@/models/task.js'
import { isUserAuthorized } from '@/helpers/userAuthorizedTaskController/isUserAuthorized.js'

// Mock explícito de las dependencias
vi.mock('@/models/task.js', () => ({
  default: vi.fn()
}))

vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: vi.fn()
}))

describe('addTask', () => {
  const userID = 12345
  const ctx = {
    from: { id: userID },
    message: { text: '/add Comprar pan - En la panadería nueva' },
    reply: vi.fn()
  }

  // Antes de cada test, restablecemos los mocks
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Parte 1: Debe agregar una tarea correctamente
  it('Debe agregar una tarea correctamente', async () => {
    isUserAuthorized.mockResolvedValue(true)

    const saveMock = vi.fn()
    Task.mockImplementation(() => ({
      save: saveMock
    }))

    await addTask(ctx)

    expect(Task).toHaveBeenCalledWith({
      userId: userID,
      name: 'Comprar pan',
      description: 'En la panadería nueva'
    })
    expect(saveMock).toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('👌🏽 Tarea creada')
  })

  // Parte 2: Debe mostrar un mensaje de error si la autorización falla
  // Parte 2: Debe mostrar un mensaje si el usuario no esta registrado
  it('debe rechar si el usuario no esta autorizado', async () => {
    isUserAuthorized.mockResolvedValue(false)
    ctx.message.text = '/add Comprar nuevo ordenador - en la tienda'

    await addTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })

})
