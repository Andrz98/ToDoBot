import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({ auth: vi.fn(), tz: vi.fn() }))
vi.mock('@/helpers/userAuthorizedTaskController/isUserAuthorized.js', () => ({
  isUserAuthorized: h.auth
}))
vi.mock(
  '@/helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js',
  () => ({
    getUserTimezone: h.tz
  })
)

import { startCommand } from '@/controllers/startController/startController.js'

describe('/start', () => {
  it('escapa el HTML del nombre del usuario (parse_mode HTML)', async () => {
    h.auth.mockResolvedValue(true)
    h.tz.mockResolvedValue('Europe/Madrid')
    const ctx = {
      from: { id: 7, first_name: 'Tom <&> Jerry' },
      reply: vi.fn().mockResolvedValue(undefined)
    }

    await startCommand(ctx)

    expect(ctx.reply.mock.calls[0][0]).toContain(
      '¡Hola, Tom &lt;&amp;&gt; Jerry!'
    )
  })
})
