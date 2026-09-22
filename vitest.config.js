import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname) // apuntando a la carpeta raíz del proyecto
    }
  },
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    // setupFiles: './tests/setup.js',
    coverage: {
      reporter: ['text', 'json', 'html'], // Formatos de reporte
      include: [
        'app.js',
        '{actions,config,controllers,events,helpers,middlewares,models,services,utils}/**/*.js'
      ]
    }
  }
})
