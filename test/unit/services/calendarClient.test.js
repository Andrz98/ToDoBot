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
    it('la integración solo está activa si las credenciales son válidas', () => {
      expect(client.isCalendarEnabled()).toBe(true)

      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '')
      expect(client.isCalendarEnabled()).toBe(false)
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
      ).rejects.toThrow('Faltan client_email o private_key')
    })
  })

  describe('getCalendarStatus', () => {
    const b64 = (value) =>
      Buffer.from(
        typeof value === 'string' ? value : JSON.stringify(value)
      ).toString('base64')
    const tempFile = (content) => {
      const file = join(mkdtempSync(join(tmpdir(), 'gcal-')), 'cuenta.json')
      writeFileSync(file, content)
      return file
    }
    const useB64 = (value) => {
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', '')
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', value)
    }
    const useFile = (file) => {
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '')
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', file)
    }
    const missingFile = () =>
      join(mkdtempSync(join(tmpdir(), 'gcal-')), 'no-existe.json')

    it('sin ninguna variable: disabled (la integración es opcional)', () => {
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', undefined)
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', undefined)

      expect(client.getCalendarStatus()).toStrictEqual({ state: 'disabled' })
    })

    it('con las variables vacías: disabled', () => {
      useB64('')

      expect(client.getCalendarStatus()).toStrictEqual({ state: 'disabled' })
      expect(client.isCalendarEnabled()).toBe(false)
    })

    it('archivo inexistente: misconfigured con la ruta y la pista de Render', () => {
      const file = missingFile()
      useFile(file)

      const status = client.getCalendarStatus()

      expect(status.state).toBe('misconfigured')
      expect(status.reason).toContain(file)
      expect(status.reason).toContain('Render')
      expect(status.reason).toContain('GOOGLE_SERVICE_ACCOUNT_JSON_B64')
      expect(client.isCalendarEnabled()).toBe(false)
    })

    it('una ruta que no es un archivo (p. ej. un directorio) también es ilegible', () => {
      useFile(tmpdir())

      expect(client.getCalendarStatus().reason).toContain('No se puede leer')
    })

    it('base64 que no es un JSON: misconfigured con la pista de una sola línea', () => {
      useB64(b64('esto no es json'))

      const status = client.getCalendarStatus()

      expect(status.state).toBe('misconfigured')
      expect(status.reason).toContain('JSON válido')
      expect(status.reason).toContain('una sola línea')
    })

    it('un archivo con basura tampoco es un JSON válido', () => {
      useFile(tempFile('{ esto no es json'))

      expect(client.getCalendarStatus().reason).toContain('JSON válido')
    })

    it('JSON sin client_email: misconfigured', () => {
      useB64(b64({ private_key: privateKey }))

      const status = client.getCalendarStatus()

      expect(status.state).toBe('misconfigured')
      expect(status.reason).toContain('client_email')
    })

    it('JSON sin private_key: misconfigured', () => {
      useB64(b64({ client_email: CREDENTIALS.client_email }))

      const status = client.getCalendarStatus()

      expect(status.state).toBe('misconfigured')
      expect(status.reason).toContain('private_key')
    })

    it.each([['null'], ['"texto"'], ['42']])(
      'un JSON válido pero que no es un objeto (%s): misconfigured, sin lanzar',
      (json) => {
        useB64(b64(json))

        expect(client.getCalendarStatus().state).toBe('misconfigured')
      }
    )

    it('private_key truncada: misconfigured', () => {
      useB64(
        b64({
          ...CREDENTIALS,
          private_key: privateKey.slice(0, privateKey.length / 2)
        })
      )

      const status = client.getCalendarStatus()

      expect(status.state).toBe('misconfigured')
      expect(status.reason).toContain('clave privada válida')
    })

    it('private_key corrupta: misconfigured', () => {
      const [head, ...rest] = privateKey.split('\n')
      const corrupt = [head, 'AAAA'.repeat(16), ...rest.slice(1)].join('\n')
      useB64(b64({ ...CREDENTIALS, private_key: corrupt }))

      expect(client.getCalendarStatus().state).toBe('misconfigured')
    })

    it('base64 válido: ready con la cuenta de servicio, sin exponer la clave', () => {
      useB64(b64(CREDENTIALS))

      expect(client.getCalendarStatus()).toStrictEqual({
        state: 'ready',
        serviceAccount: CREDENTIALS.client_email
      })
      expect(client.isCalendarEnabled()).toBe(true)
    })

    it('archivo válido (uso local): ready', () => {
      useFile(tempFile(JSON.stringify(CREDENTIALS)))

      expect(client.getCalendarStatus()).toStrictEqual({
        state: 'ready',
        serviceAccount: CREDENTIALS.client_email
      })
    })

    it('con ambas definidas gana el base64', () => {
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', b64(CREDENTIALS))
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_FILE', missingFile())
      expect(client.getCalendarStatus().state).toBe('ready')

      // Y al revés: un base64 roto no se "rescata" con un archivo bueno
      vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', b64('basura'))
      vi.stubEnv(
        'GOOGLE_SERVICE_ACCOUNT_FILE',
        tempFile(JSON.stringify(CREDENTIALS))
      )
      expect(client.getCalendarStatus().state).toBe('misconfigured')
    })

    it('el base64 admite saltos de línea (los ignora al decodificar)', () => {
      useB64(b64(CREDENTIALS).replace(/(.{60})/g, '$1\n'))

      expect(client.getCalendarStatus().state).toBe('ready')
    })

    it('ningún motivo cita la clave privada, el valor de la variable ni un mensaje de JSON.parse', () => {
      const secretLine = privateKey.split('\n')[1]
      const cases = [
        () => useFile(missingFile()),
        () => useB64(b64('token-secreto-que-no-es-json')),
        () => useB64(b64({ private_key: privateKey })),
        () => useB64(b64({ client_email: CREDENTIALS.client_email })),
        () =>
          useB64(
            b64({
              ...CREDENTIALS,
              private_key: privateKey.slice(0, privateKey.length / 2)
            })
          )
      ]

      const reasons = cases.map((arrange) => {
        arrange()
        const { state, reason } = client.getCalendarStatus()
        expect(state).toBe('misconfigured')
        expect(reason).not.toContain(secretLine)
        expect(reason).not.toContain('token-secreto')
        // Con el archivo como fuente la variable va vacía: '' está en cualquier texto
        const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64
        expect(base64 === '' || !reason.includes(base64)).toBe(true)
        expect(reason).not.toMatch(/Unexpected token|in JSON|position \d/)
        return reason
      })

      // Cuatro causas, cuatro textos (sin client_email y sin private_key comparten el suyo)
      expect(new Set(reasons).size).toBe(4)
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
      queue(reply(200, { id: 'cal-1' }), reply(204), reply(400))

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

  describe('eventos', () => {
    const event = { id: 'a1b2c3', summary: 'Ana', status: 'tentative' }
    const CAL = 'cal-1@group.calendar.google.com'
    const EVENTS = `https://www.googleapis.com/calendar/v3/calendars/cal-1%40group.calendar.google.com/events`

    it('upsertEvent inserta con el id fijado por quien llama', async () => {
      queue(reply(200, event))

      await client.upsertEvent(CAL, event)

      expect(apiCalls()).toHaveLength(1)
      const [url, init] = apiCalls()[0]
      expect(url).toBe(EVENTS)
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual(event)
    })

    it('si el evento ya existe (409), lo actualiza en vez de duplicarlo', async () => {
      queue(
        reply(409, { error: { message: 'identifier already exists' } }),
        reply(200, event)
      )

      await client.upsertEvent(CAL, event)

      const [insert, update] = apiCalls()
      expect(insert[1].method).toBe('POST')
      expect(update[0]).toBe(`${EVENTS}/a1b2c3`)
      expect(update[1].method).toBe('PUT')
      expect(JSON.parse(update[1].body)).toEqual(event)
    })

    it('un error distinto de 409 se propaga sin intentar actualizar', async () => {
      queue(reply(403, { error: { message: 'rate limit' } }))

      await expect(client.upsertEvent(CAL, event)).rejects.toMatchObject({
        status: 403
      })
      expect(apiCalls()).toHaveLength(1)
    })

    it('si falla la actualización tras el 409, también se propaga', async () => {
      queue(reply(409), reply(500, { error: { message: 'caído' } }))

      await expect(client.upsertEvent(CAL, event)).rejects.toMatchObject({
        status: 500
      })
    })

    it('deleteEvent borra el evento indicado', async () => {
      queue(reply(204))

      await client.deleteEvent(CAL, 'a1b2c3')

      const [url, init] = apiCalls()[0]
      expect(url).toBe(`${EVENTS}/a1b2c3`)
      expect(init.method).toBe('DELETE')
    })

    it.each([
      [404, 'nunca existió'],
      [410, 'ya estaba borrado']
    ])('deleteEvent: %i (%s) no es un error', async (status) => {
      queue(reply(status, { error: { message: 'gone' } }))

      await expect(client.deleteEvent(CAL, 'a1b2c3')).resolves.toBeUndefined()
    })

    it('deleteEvent: otros errores se propagan', async () => {
      queue(reply(500, { error: { message: 'caído' } }))

      await expect(client.deleteEvent(CAL, 'a1b2c3')).rejects.toMatchObject({
        status: 500
      })
    })
  })

  describe('deleteCalendar', () => {
    it('borra dos veces (la 2ª retira del todo el calendario vacío) y sin re-consultar', async () => {
      queue(reply(204), reply(400, { error: { message: 'Bad Request' } }))

      await client.deleteCalendar('cal-1@group.calendar.google.com')

      const calls = apiCalls()
      expect(calls.map(([, init]) => init.method)).toEqual(['DELETE', 'DELETE'])
      expect(calls[0][0]).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/cal-1%40group.calendar.google.com'
      )
      expect(calls[1][0]).toBe(calls[0][0])
    })

    it.each([
      [404, 'no encontrado'],
      [410, 'borrado'],
      [400, 'el 400 que Google devuelve al borrar dos veces']
    ])(
      'un calendario que ya no existe (%i: %s) no es un error',
      async (status) => {
        queue(
          reply(status, { error: { message: 'gone' } }),
          reply(status, { error: { message: 'gone' } })
        )

        await expect(client.deleteCalendar('cal-1')).resolves.toBeUndefined()
      }
    )

    it.each([403, 500, 503])(
      'el error %i sí se propaga (y no se reintenta)',
      async (status) => {
        queue(reply(status, { error: { message: 'no' } }))

        await expect(client.deleteCalendar('cal-1')).rejects.toMatchObject({
          name: 'GoogleApiError',
          status
        })
        expect(apiCalls()).toHaveLength(1)
      }
    )
  })
})
