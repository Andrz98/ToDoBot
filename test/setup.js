import { vi } from 'vitest'

// Los tests nunca cargan el .env real: sus secretos no deben llegar al proceso
// de test y los tests que borran una variable deben ver ese borrado
vi.mock('@/config/env.js', () => ({}))
