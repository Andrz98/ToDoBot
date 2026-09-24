import { describe, it, expect } from 'vitest'
import { Task, COMPLETED_TTL_SECONDS } from '@/models/task.js'

describe('modelo Task', () => {
  it('las completadas caducan solas a los 30 días; las pendientes no', () => {
    const [keys, options] = Task.schema
      .indexes()
      .find(([, opts]) => opts.expireAfterSeconds)

    expect(keys).toEqual({ updatedAt: 1 })
    expect(COMPLETED_TTL_SECONDS).toBe(30 * 24 * 60 * 60)
    expect(options.expireAfterSeconds).toBe(COMPLETED_TTL_SECONDS)
    expect(options.partialFilterExpression).toEqual({ completed: true })
  })
})
