import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clearTask } from '@/controllers/taskControllers/clearTask.js'
import { isUserAuthorized } from '@/helpers/userAuthorizedTaskController/isUserAuthorized.js'
import Task from '@/models/task.js'

// Mock explícito de Task con métodos simulados
vi.mock('@/models/task.js', () => ({
  default: {
    countDocuments: vi.fn(),
    deleteMany: vi.fn()
  }
}))

// Mock explícito de autorización
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: vi.fn()
}))

describe('clearTask', () => {
  let ctx
  const userId = 12345

  beforeEach(() => {
    vi.clearAllMocks()
    ctx = {
      from: { id: userId },
      message: { text: '' },
      reply: vi.fn()
    }
  })

  // Parte 1: Si el usuario no está registrado lo rechaza
  it('debe rechazar si el usuario no está autorizado', async () => {
    isUserAuthorized.mockResolvedValue(false)
    ctx.message.text = '/clear'

    await clearTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🥸 Debes estar autorizado para usar este bot.'
    )
  })

  // Parte 2: Si el usuario no tiene tareas activas lo rechaza
  it('debe responder que no hay tareas activas en /clear', async () => {
    isUserAuthorized.mockResolvedValue(true)
    Task.countDocuments.mockResolvedValue(0)
    ctx.message.text = '/clear'

    await clearTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 No tienes tareas activas que eliminar.'
    )
  })

  // Parte 3: Tenemos que solicitar la confirmación de que existen tareas activas
  it('debe pedir confirmación si hay tareas activas en /clear', async () => {
    isUserAuthorized.mockResolvedValue(true)
    Task.countDocuments.mockResolvedValue(3)
    ctx.message.text = '/clear'

    await clearTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '❗ Estás a punto de eliminar *3* tareas. ¿Confirmas?',
      expect.any(Object)
    )
  })

  // Parte 4: Cuando countDocument resulta en (0), entonces no hay tareas que confirmar
  it('debe indicar que no hay en /confirmclear si countDocument = (0)', async () => {
    isUserAuthorized.mockResolvedValue(true)
    Task.countDocuments.mockResolvedValue(0)
    ctx.message.text = '/confirmclear'

    await clearTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 No tienes tareas activas que eliminar.'
    )
  })

  // Parte 5: Cuando countDocument resulta en (2), entonces sí hay tareas que confirmar
  it('debe eliminar tareas correctamente en /confirmclear', async () => {
    isUserAuthorized.mockResolvedValue(true)
    Task.countDocuments.mockResolvedValue(2)
    Task.deleteMany.mockResolvedValue({}) // simulamos eliminación
    ctx.message.text = '/confirmclear'

    await clearTask(ctx)

    expect(Task.deleteMany).toHaveBeenCalledWith({ userId })
    expect(ctx.reply).toHaveBeenCalledWith('👌🏽 Tareas eliminadas')
  })

  // Parte 6: Cuando el comando no es válido entonces mostramos un mensaje de "Comando no válido"
  it('debe responder "Comando no válido" si no es /clear ni /confirmclear', async () => {
    isUserAuthorized.mockResolvedValue(true)
    ctx.message.text = '/invalidCommand'

    await clearTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '🤯 Comando no válido. Usa /clear para empezar.'
    )
  })

  // Parte 7: Debe capturar errores internos y responder con error genérico
  it('debe capturar errores internos y responder con error genérico', async () => {
    isUserAuthorized.mockResolvedValue(true)
    Task.countDocuments.mockRejectedValue(new Error('Fallo interno'))
    ctx.message.text = '/clear'

    await clearTask(ctx)

    expect(ctx.reply).toHaveBeenCalledWith(
      '😵‍💫 Ocurrió un error al iniciar el borrado. Intenta más tarde.'
    )
  })
})
