import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname) // apuntando a la carpeta raíz del proyecto
    }
  },
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    // setupFiles: './tests/setup.js',
    coverage: {
      reporter: ['text', 'json', 'html'], // Formatos de reporte
      exclude: ['node_modules/', 'tests/', 'config/'] // Excluye archivos irrelevantes
    }
  }
})
