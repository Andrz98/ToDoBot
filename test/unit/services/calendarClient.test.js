import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createVerify, generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ fetch: vi.fn() }))

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})
const CREDENTIALS = {
  client_email: 'bot@proyecto.iam.gserviceaccount.com',
  private_key: privateKey
}
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: `HTTP ${status}`,
  json: async () => body,
  text: async () => (body === undefined ? '' : JSON.stringify(body))
})

/** fetch falso: el token siempre va bien; el resto de llamadas salen de la cola. */
const queue = (...replies) => {
  const pending = [...replies]
  h.fetch.mockImplementation(async (url) =>
    url === TOKEN_URL
      ? reply(200, { access_token: 'tok-1', expires_in: 3600 })
      : pending.shift()
  )
}
const apiCalls = () => h.fetch.mock.calls.filter(([url]) => url !== TOKEN_URL)
const tokenCalls = () => h.fetch.mock.calls.filter(([url]) => url === TOKEN_URL)

describe('calendarClient', () => {
  let client
  beforeEach(async () => {
    vi.resetModules() // el token en caché vive en el módulo
    h.fetch.mockReset()
    vi.stubGlobal('fetch', h.fetch)
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', '')
    vi.stubEnv(
      'GOOGLE_SERVICE_ACCOUNT_JSON_B64',
      Buffer.from(JSON.stringify(CREDENTIALS)).toString('base64')
    )
    client = await import('@/services/google/calendarClient.js')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('credenciales', () => {
    it('la integración solo está activa si hay credenciales', () => {
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '')
      expect(client.isCalendarEnabled()).toBe(false)

      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', 'C:\\claves\\cuenta.json')
      expect(client.isCalendarEnabled()).toBe(true)
    })

    it('también se leen de un archivo (uso local)', async () => {
      const file = join(mkdtempSync(join(tmpdir(), 'gcal-')), 'cuenta.json')
      writeFileSync(file, JSON.stringify(CREDENTIALS))
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '')
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', file)
      queue(reply(200, { id: 'cal-1' }))

      await expect(
        client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      ).resolves.toBe('cal-1')
    })

    it('unas credenciales sin clave privada se rechazan', async () => {
      vi.stubEnv(
        'GOOGLE_SERVICE_ACCOUNT_JSON_B64',
        Buffer.from(JSON.stringify({ client_email: 'a@b.c' })).toString(
          'base64'
        )
      )

      await expect(
        client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      ).rejects.toThrow('Credenciales de Google inválidas')
    })
  })

  describe('token', () => {
    it('pide un JWT RS256 firmado con la clave de la cuenta de servicio', async () => {
      queue(reply(200, { id: 'cal-1' }))

      await client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })

      const [, init] = tokenCalls()[0]
      const params = new URLSearchParams(init.body)
      expect(params.get('grant_type')).toBe(
        'urn:ietf:params:oauth:grant-type:jwt-bearer'
      )
      const [header, claims, signature] = params.get('assertion').split('.')
      const decode = (part) =>
        JSON.parse(Buffer.from(part, 'base64url').toString())
      expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
      expect(decode(claims)).toMatchObject({
        iss: CREDENTIALS.client_email,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: TOKEN_URL
      })
      const valid = createVerify('RSA-SHA256')
        .update(`${header}.${claims}`)
        .verify(publicKey, signature, 'base64url')
      expect(valid).toBe(true)
    })

    it('reutiliza el token hasta que está a punto de caducar y entonces lo renueva', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2099-01-01T00:00:00Z'))
      queue(
        reply(200, { id: 'a' }),
        reply(200, { id: 'b' }),
        reply(200, { id: 'c' })
      )

      await client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      await client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      expect(tokenCalls()).toHaveLength(1)

      vi.setSystemTime(new Date('2099-01-01T00:59:30Z')) // < 60 s de margen
      await client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      expect(tokenCalls()).toHaveLength(2)
    })

    it('un rechazo de Google al pedir el token se convierte en GoogleApiError', async () => {
      h.fetch.mockResolvedValue(
        reply(400, {
          error: 'invalid_grant',
          error_description: 'clave revocada'
        })
      )

      await expect(
        client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      ).rejects.toMatchObject({
        name: 'GoogleApiError',
        status: 400,
        message: 'clave revocada'
      })
    })
  })

  describe('operaciones', () => {
    it('createCalendar crea un calendario con zona horaria y devuelve su id', async () => {
      queue(reply(200, { id: 'cal-1@group.calendar.google.com' }))

      const id = await client.createCalendar({
        summary: 'TuttoFatto — Ana',
        timeZone: 'Europe/Madrid',
        description: 'Solo lectura'
      })

      expect(id).toBe('cal-1@group.calendar.google.com')
      const [url, init] = apiCalls()[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars')
      expect(init.method).toBe('POST')
      expect(init.headers.authorization).toBe('Bearer tok-1')
      expect(JSON.parse(init.body)).toEqual({
        summary: 'TuttoFatto — Ana',
        timeZone: 'Europe/Madrid',
        description: 'Solo lectura'
      })
    })

    it('shareCalendar comparte como lector y deja que Google envíe la invitación', async () => {
      queue(reply(200, { role: 'reader' }))

      await client.shareCalendar(
        'cal-1@group.calendar.google.com',
        'ana@gmail.com'
      )

      const [url, init] = apiCalls()[0]
      expect(url).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/cal-1%40group.calendar.google.com/acl?sendNotifications=true'
      )
      expect(JSON.parse(init.body)).toEqual({
        role: 'reader',
        scope: { type: 'user', value: 'ana@gmail.com' }
      })
    })

    it('solo declara content-type cuando hay cuerpo', async () => {
      queue(reply(200, { id: 'cal-1' }), reply(204))

      await client.createCalendar({ summary: 'x', timeZone: 'Europe/Madrid' })
      await client.deleteCalendar('cal-1')

      const [create, del] = apiCalls().map(([, init]) => init.headers)
      expect(create['content-type']).toBe('application/json')
      expect(del).not.toHaveProperty('content-type')
    })

    it('un error de la API lleva su estado y el mensaje de Google', async () => {
      queue(reply(400, { error: { message: 'Invalid scope value.' } }))

      await expect(
        client.shareCalendar('cal-1', 'no-es-google@example.com')
      ).rejects.toMatchObject({ status: 400, message: 'Invalid scope value.' })
    })
  })

  describe('deleteCalendar', () => {
    it('borra con un único DELETE (sin re-consultar: Google tarda en reflejarlo)', async () => {
      queue(reply(204))

      await client.deleteCalendar('cal-1@group.calendar.google.com')

      const [url, init] = apiCalls()[0]
      expect(apiCalls()).toHaveLength(1)
      expect(init.method).toBe('DELETE')
      expect(url).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/cal-1%40group.calendar.google.com'
      )
    })

    it.each([
      [404, 'no encontrado'],
      [410, 'borrado'],
      [400, 'el 400 que Google devuelve al borrar dos veces']
    ])(
      'un calendario que ya no existe (%i: %s) no es un error',
      async (status) => {
        queue(reply(status, { error: { message: 'Bad Request' } }))

        await expect(client.deleteCalendar('cal-1')).resolves.toBeUndefined()
      }
    )

    it.each([403, 500, 503])('el error %i sí se propaga', async (status) => {
      queue(reply(status, { error: { message: 'no' } }))

      await expect(client.deleteCalendar('cal-1')).rejects.toMatchObject({
        name: 'GoogleApiError',
        status
      })
    })
  })
})
