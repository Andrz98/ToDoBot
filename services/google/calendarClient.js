import { createPrivateKey, createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/calendar'
// Crear un calendario tarda 5–8 s (y más con la conexión en frío): 10 s era muy justo
const TIMEOUT_MS = 30_000
const TOKEN_MARGIN_MS = 60_000

export class GoogleApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'GoogleApiError'
    this.status = status
  }
}

const misconfigured = (reason) => ({ state: 'misconfigured', reason })

/**
 * Única lectura y validación de las credenciales: la comparten el arranque, el
 * menú y la firma del token. Producción usa el JSON en base64 (variable
 * secreta, con prioridad); en local, la ruta del archivo.
 * Los motivos son textos fijos. Nunca citan el contenido de la variable ni del
 * archivo, ni el mensaje de JSON.parse o de Node (podrían filtrar la clave
 * privada a los logs); lo único variable es la ruta, que no es secreta.
 */
function loadCredentials() {
  const {
    GOOGLE_SERVICE_ACCOUNT_JSON_B64: base64,
    GOOGLE_SERVICE_ACCOUNT_FILE: file
  } = process.env
  if (!base64 && !file) {
    return { state: 'disabled' }
  }

  let raw
  if (base64) {
    raw = Buffer.from(base64, 'base64').toString('utf8')
  } else {
    try {
      raw = readFileSync(file, 'utf8')
    } catch {
      return misconfigured(
        `No se puede leer el archivo de credenciales de Google (${file}). ` +
          'Render no tiene acceso a rutas locales: usa GOOGLE_SERVICE_ACCOUNT_JSON_B64.'
      )
    }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return misconfigured(
      'Las credenciales de Google no son un JSON válido. Si usas ' +
        'GOOGLE_SERVICE_ACCOUNT_JSON_B64, pega el base64 en una sola línea, ' +
        'sin comillas ni saltos de línea.'
    )
  }
  if (!parsed?.client_email || !parsed?.private_key) {
    return misconfigured(
      'Faltan client_email o private_key en las credenciales de Google.'
    )
  }
  // Solo se parsea la clave: comprueba que no está truncada, sin firmar nada
  try {
    createPrivateKey(parsed.private_key)
  } catch {
    return misconfigured(
      'La private_key de las credenciales de Google no es una clave privada válida (¿está truncada?).'
    )
  }
  return {
    state: 'ready',
    serviceAccount: parsed.client_email,
    privateKey: parsed.private_key
  }
}

/**
 * Estado de la integración, opcional: sin credenciales el bot funciona igual,
 * sin Calendar ('disabled'). Nunca devuelve secretos: solo la cuenta de
 * servicio o, si algo falla, el motivo.
 * @returns {{ state: 'disabled' | 'misconfigured' | 'ready', reason?: string, serviceAccount?: string }}
 */
export function getCalendarStatus() {
  const { state, reason, serviceAccount } = loadCredentials()
  return {
    state,
    ...(reason && { reason }),
    ...(serviceAccount && { serviceAccount })
  }
}

/** Solo con credenciales legibles y válidas: así /calendar no se ofrece roto. */
export const isCalendarEnabled = () => getCalendarStatus().state === 'ready'

function credentials() {
  const { state, reason, serviceAccount, privateKey } = loadCredentials()
  if (state !== 'ready') {
    throw new Error(reason ?? 'Google Calendar no está configurado')
  }
  return { clientEmail: serviceAccount, privateKey }
}

const b64url = (value) => Buffer.from(value).toString('base64url')

let cached = null // { token, expiresAt }

/** Token de la cuenta de servicio (JWT firmado con RS256); se reutiliza hasta que caduca. */
async function accessToken() {
  if (cached && cached.expiresAt - Date.now() > TOKEN_MARGIN_MS) {
    return cached.token
  }

  const { clientEmail, privateKey } = credentials()
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600
    })
  )
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(privateKey, 'base64url')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  const data = await res.json()
  if (!res.ok) {
    throw new GoogleApiError(res.status, data.error_description ?? data.error)
  }

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }
  return cached.token
}

/**
 * Llamada a la API de Calendar. Lanza GoogleApiError salvo que el estado esté
 * en `ok` (p. ej. 404 al comprobar que algo ya no existe).
 */
async function call(method, path, { body, ok = [] } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      ...(body && { 'content-type': 'application/json' })
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok && !ok.includes(res.status)) {
    throw new GoogleApiError(res.status, data?.error?.message ?? res.statusText)
  }
  return { status: res.status, data }
}

/** Crea un calendario secundario propiedad de la cuenta de servicio y devuelve su id. */
export async function createCalendar({ summary, timeZone, description }) {
  const { data } = await call('POST', '/calendars', {
    body: { summary, timeZone, description }
  })
  return data.id
}

/** Lo comparte como lector con `email`; Google le envía la invitación por correo. */
export async function shareCalendar(calendarId, email) {
  await call(
    'POST',
    `/calendars/${encodeURIComponent(calendarId)}/acl?sendNotifications=true`,
    { body: { role: 'reader', scope: { type: 'user', value: email } } }
  )
}

/**
 * Crea o actualiza el evento (su `id` lo fija quien llama, así que reintentar
 * nunca duplica): intenta insertar y, si ya existe (409), lo actualiza.
 * Ojo: un PUT sobre un evento borrado lo resucita; los borrados van por deleteEvent.
 */
export async function upsertEvent(calendarId, event) {
  const calendar = encodeURIComponent(calendarId)
  const insert = await call('POST', `/calendars/${calendar}/events`, {
    body: event,
    ok: [409]
  })
  if (insert.status === 409) {
    await call(
      'PUT',
      `/calendars/${calendar}/events/${encodeURIComponent(event.id)}`,
      { body: event }
    )
  }
}

/** Borra el evento. Idempotente: 404 (nunca existió) y 410 (ya borrado) no son errores. */
export async function deleteEvent(calendarId, eventId) {
  await call(
    'DELETE',
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { ok: [404, 410] }
  )
}

/**
 * Borra el calendario. Es idempotente: si ya no existe, no es un error.
 *
 * Comprobado contra Google: el primer DELETE responde 204 y sus eventos dejan
 * de poder leerse al instante, pero el calendario vacío sigue apareciendo en
 * las listas (GET intermitente) durante minutos. Repetir el DELETE responde 400
 * ("ya borrado") y lo retira del todo, por eso se envía dos veces.
 */
export async function deleteCalendar(calendarId) {
  const path = `/calendars/${encodeURIComponent(calendarId)}`
  await call('DELETE', path, { ok: [400, 404, 410] })
  await call('DELETE', path, { ok: [400, 404, 410] })
}
