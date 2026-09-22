import { safeDeleteMessage } from './safeDeleteMessage.js'
import { safeReply } from '../retryUtils/safeReply.js'

/**
 * Política de permanencia de mensajes en el chat.
 *  - STEP:      prompts y respuestas intermedias de un flujo, comandos ya procesados
 *  - NOTICE:    resultados y avisos breves ("✅ Tarea creada", "Operación cancelada")
 *  - INTERFACE: menús, listados, selectores. Se renueva con cada interacción
 */
export const TTL = Object.freeze({
  STEP: 10_000,
  NOTICE: 10_000,
  INTERFACE: 10 * 60_000
})

// Un único temporizador vivo por mensaje: programar de nuevo reemplaza al anterior,
// así un temporizador viejo nunca borra una interfaz que se reutilizó después.
const pending = new Map()

const keyOf = (chatId, messageId) => `${chatId}:${messageId}`

/**
 * Programa el borrado diferido de un mensaje. No bloquea: el flujo sigue en el acto.
 * Si el mensaje ya tenía un borrado programado, lo sustituye.
 */
export function scheduleDeletion(ctx, messageId, ms, chatId = ctx.chat?.id) {
  if (!messageId || !chatId) {
    return
  }
  const key = keyOf(chatId, messageId)
  cancelDeletion(chatId, messageId)

  const { telegram } = ctx
  const entry = { ms }
  entry.timer = setTimeout(() => {
    if (pending.get(key) !== entry) {
      return
    }
    pending.delete(key)
    safeDeleteMessage({ telegram }, chatId, messageId)
  }, ms)
  entry.timer.unref?.()
  pending.set(key, entry)
}

/**
 * Reinicia la cuenta atrás de un mensaje con su mismo TTL. Si no tenía ninguno
 * (p. ej. tras un reinicio del proceso), programa `defaultMs`.
 */
export function renewDeletion(ctx, messageId, defaultMs, chatId = ctx.chat?.id) {
  const ms = pending.get(keyOf(chatId, messageId))?.ms ?? defaultMs
  if (ms) {
    scheduleDeletion(ctx, messageId, ms, chatId)
  }
}

export function cancelDeletion(chatId, messageId) {
  const key = keyOf(chatId, messageId)
  const entry = pending.get(key)
  if (entry) {
    clearTimeout(entry.timer)
    pending.delete(key)
  }
}

/** Borra ya un mensaje, anulando cualquier borrado diferido que tuviera. */
export async function deleteNow(ctx, messageId, chatId = ctx.chat?.id) {
  if (!messageId || !chatId) {
    return
  }
  cancelDeletion(chatId, messageId)
  await safeDeleteMessage(ctx, chatId, messageId)
}

/** Envía un mensaje que se autodestruye pasado `ms`. */
export async function replyTemporary(ctx, text, extra = {}, ms = TTL.NOTICE) {
  const msg = await safeReply(ctx, text, extra)
  scheduleDeletion(ctx, msg?.message_id, ms)
  return msg
}

/** Envía una interfaz (menú, listado, selector) con TTL renovable por interacción. */
export async function replyInterface(ctx, text, extra = {}) {
  return replyTemporary(ctx, text, extra, TTL.INTERFACE)
}
