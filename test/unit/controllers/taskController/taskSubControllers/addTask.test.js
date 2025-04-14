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
    expect(ctx.reply).toHaveBeenCalledWith(
      '🫡 La tarea se ha añadido correctamente: \n"En la panadería nueva"'
    )
  })

  // Parte 2: Debe mostrar un mensaje de error si la autorización falla
  it('Debe rechazar si falta el guión del mensaje', async () => {
    ctx.message.text = '/add ComprarPanSinSeparador'
    await addTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 Debes proporcionar una descripción de la tarea. Ejemplo:\n/add Comprar pan'
    )
  })

  // Parte 3: Debe mostrar un mensaje si el usuario no esta registrado
  it('debe rechar si el usuario no esta autorizado', async () => {
    isUserAuthorized.mockResolvedValue(false)
    ctx.message.text = '/add Comprar nuevo ordenador - en la tienda'

    await addTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })

  // Parte 4: Debe mostrar un mensaje si el nombre de usuario esta duplicado en MongoDB
  it('debe rechazar si el nombre está duplicado (MongoError)', async () => {
    isUserAuthorized.mockResolvedValue(true)

    Task.mockImplementation(() => ({
      save: vi.fn().mockRejectedValue({ code: 11000 })
    }))

    await addTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 Ya tienes una tarea con ese nombre. Por favor, elige otro nombre para la tarea.'
    )
  })

  // Parte 5: Se debe mostrar un error genético si ocurre una excepción
  it('debe responder con un error genérico si ocurre una excepción', async () => {
    isUserAuthorized.mockResolvedValue(true)

    Task.mockImplementation(() => ({
      save: vi.fn().mockRejectedValue(new Error('Fallo inesperado'))
    }))

    await addTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫Ha sucedido un error al añadir tu tarea. Intentalo nuevamente'
    )
  })
})
