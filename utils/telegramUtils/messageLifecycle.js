import mongoose from 'mongoose'
import { safeDeleteMessage } from './safeDeleteMessage.js'
import { safeReply } from '../retryUtils/safeReply.js'
import { PendingDeletion } from '../../models/pendingDeletion.js'
import { debugLog } from '../logUtils/debugLog.js'

/**
 * Política de permanencia de mensajes en el chat.
 *  - STEP:      prompts y respuestas intermedias de un flujo, comandos ya procesados
 *  - NOTICE:    resultados y avisos breves ("✅ Tarea creada", "Acción finalizada")
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

// Copia en Mongo de cada borrado programado: si el proceso se reinicia, el
// temporizador en memoria desaparece, pero al arrancar `recoverPendingDeletions`
// vuelve a armarlos (o borra ya los que ya vencieron). Sin conexión a BD
// (p. ej. en tests) esto es un no-op silencioso: la limpieza en memoria sigue
// funcionando igual, solo se pierde la garantía de sobrevivir a un reinicio.
const isDbReady = () => mongoose.connection.readyState === 1

const persistDeletion = (chatId, messageId, deleteAt) => {
  if (!isDbReady()) {
    return
  }
  PendingDeletion.updateOne(
    { chatId, messageId },
    { deleteAt },
    { upsert: true }
  ).catch((error) =>
    debugLog('🗑️ [persistDeletion] no se pudo guardar:', error?.message)
  )
}

const removePersistedDeletion = (chatId, messageId) => {
  if (!isDbReady()) {
    return
  }
  PendingDeletion.deleteOne({ chatId, messageId }).catch(() => {})
}

/** Arma el temporizador en memoria. No toca la copia persistida. */
function armTimer(ctx, chatId, messageId, ms) {
  const key = keyOf(chatId, messageId)
  const existing = pending.get(key)
  if (existing) {
    clearTimeout(existing.timer)
  }

  const { telegram } = ctx
  const entry = { ms }
  entry.timer = setTimeout(() => {
    if (pending.get(key) !== entry) {
      return
    }
    pending.delete(key)
    safeDeleteMessage({ telegram }, chatId, messageId)
    removePersistedDeletion(chatId, messageId)
  }, ms)
  entry.timer.unref?.()
  pending.set(key, entry)
}

/**
 * Programa el borrado diferido de un mensaje. No bloquea: el flujo sigue en el acto.
 * Si el mensaje ya tenía un borrado programado, lo sustituye.
 */
export function scheduleDeletion(ctx, messageId, ms, chatId = ctx.chat?.id) {
  if (!messageId || !chatId) {
    return
  }
  armTimer(ctx, chatId, messageId, ms)
  persistDeletion(chatId, messageId, new Date(Date.now() + ms))
}

/**
 * Al arrancar el proceso: borra ya los mensajes cuyo plazo venció mientras
 * estaba caído, y rearma en memoria el resto con el tiempo que les quede.
 * @param {import('telegraf').Telegraf} bot
 */
export async function recoverPendingDeletions(bot) {
  if (!isDbReady()) {
    return
  }
  const rows = await PendingDeletion.find().lean()
  const ctx = { telegram: bot.telegram }
  const now = Date.now()

  for (const { chatId, messageId, deleteAt } of rows) {
    const remaining = new Date(deleteAt).getTime() - now
    if (remaining <= 0) {
      await safeDeleteMessage(ctx, chatId, messageId)
      await PendingDeletion.deleteOne({ chatId, messageId }).catch(() => {})
    } else {
      armTimer(ctx, chatId, messageId, remaining)
    }
  }
}

/**
 * Reinicia la cuenta atrás de un mensaje con su mismo TTL. Si no tenía ninguno
 * (p. ej. tras un reinicio del proceso), programa `defaultMs`.
 */
export function renewDeletion(
  ctx,
  messageId,
  defaultMs,
  chatId = ctx.chat?.id
) {
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
  removePersistedDeletion(chatId, messageId)
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
