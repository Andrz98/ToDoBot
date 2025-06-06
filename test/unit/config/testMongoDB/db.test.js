import { describe, it, expect, vi, afterEach } from 'vitest'

// Antes de cualquier import o ejecución de código, interceptamos el módulo 'mongoose' con vi.mock()
// Declaramos el mock global que será compartido entre ambos tests y controlado mediante la URI
// Si la URI contiene 'error', simulamos una conexión fallida para forzar el catch
vi.mock('mongoose', () => {
  const mockConnect = vi.fn((uri) => {
    if (uri.includes('error')) {
      return Promise.reject(new Error('Connection failed'))
    }

    // Simulamos la conexión con un objeto que tiene una propiedad connection.host
    const fakeMongoose = {
      connection: {
        host: 'mocked-host'
      }
    }

    // Simulamos que mongoose.connect() resuelve el objeto de conexión
    Object.assign(fakeMongoose, { connect: mockConnect })

    return Promise.resolve(fakeMongoose)
  })

  return {
    connect: mockConnect,
    connection: {
      host: 'mocked-host'
    },
    default: {
      connect: mockConnect,
      connection: {
        host: 'mocked-host'
      }
    }
  }
})

// Definimos el bloque agrupador de test relacionados. En describe organizo la lógica de los test
describe('connectDB', () => {
  // Después de cada test, se restaura el entorno original.
  // vi.restoreAllMocks() elimina todos los mocks y espías creados por vi, asegurando que los siguientes tests no estén contaminados por los anteriores.
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Ahora se define el test individual que verifica una afirmación muy específica
  // "connectDB()" debe llamar a "mongoose.connect" con la URI correcta
  it('Should call mongoose.connect with correct URI', async () => {
    // Ahora se simula una variable de entorno para que connectDB() la utilice internamente
    process.env.MONGO_URI = 'mongodb://uri-for-testing'

    // Importamos dinámicamente después del mock
    const connectDB = (await import('../../../../config/MongoDB/db.js')).default

    // Ejecutamos la función real connectDB, siendo este el paso Act de AAA
    await connectDB()

    // De nuevo se importa mongoose para acceder a su versión mockeada y poder hacer afirmaciones sobre ella (expect(mongoose.connect))
    const mongoose = await import('mongoose')

    // Se afirma que la función fue llamada exactamente una vez. De esta forma valida que no hubo doble llamada accidental ni que se omitió la conexión
    expect(mongoose.connect).toHaveBeenCalledTimes(1)

    // Por último afirmamos que la función fue llamada con el valor correcto, es decir, la URI que definí en process.env
    // Garantizamos que se está usando la variable de entorno correctamente y que se está llamando a mongoose.connect
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://uri-for-testing')
  })

  // Ahora se define el test unhappy path, esto debe desarrollarse dentro del mismo describe
  // Aquí debemos ver que se imprime un mensaje de error con console.error() y además se ejecuta process.exit(1) para terminar la app
  it('Should log error and exit process if mongoose.connect throws', async () => {
    // Necesitamos crear espías sobre console.error y process.exit.
    // Los spyOn permiten verificar si fueron llamados y previenen que realmente se ejecute process.exit(1), de esta manera se evita que vite se corte
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})

    // Se establece la variable de entorno simulada que será pasada a mongoose.connect
    process.env.MONGO_URI = 'mongodb://uri-for-testing-error'

    // Nuevamente importamos la función connectDB y la ejecutamos dinámicamente, hemos preparado el mock para que caiga directamente en el catch
    const connectDB = (await import('../../../../config/MongoDB/db.js')).default
    await connectDB()

    // Después validamos que console.error ha sido llamado con el mensaje que ya predefiní como parte del console.error
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('🦽 Nos está fallando la conexión a MongoDB')
    )

    // Acto seguido, confirmamos que el proceso se intentó cerrar con exit(1), como definí en mi componente db.js
    expect(exitSpy).toHaveBeenCalledWith(1)

    // Finalmente se restaura el comportamiento original de console.error y process.exit para evitar que se contaminen los tests
    errorSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
