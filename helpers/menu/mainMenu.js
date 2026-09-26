import { Markup } from 'telegraf'
import {
  deleteNow,
  replyInterface
} from '../../utils/telegramUtils/messageLifecycle.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import { getUserTimezone } from '../taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { isCalendarEnabled } from '../../services/google/calendarClient.js'

/**
 * Acciones del menú principal: cada botón `menu_<comando>` equivale al comando.
 * Una acción con `enabled` solo se ofrece si devuelve true (integración opcional).
 */
export const MENU_ACTIONS = [
  { command: 'add', label: '➕ Nueva tarea', help: 'Añadir nueva tarea' },
  { command: 'list', label: '📋 Mis tareas', help: 'Ver tareas activas' },
  { command: 'done', label: '✅ Completar', help: 'Marcar tarea como completada' },
  { command: 'edit', label: '✏️ Editar', help: 'Editar tarea existente' },
  { command: 'reminder', label: '🔔 Recordatorio', help: 'Configurar periodicidad del recordatorio' },
  { command: 'delete', label: '🗑️ Eliminar', help: 'Eliminar tarea' },
  { command: 'clear', label: '🧹 Limpiar completadas', help: 'Eliminar tareas completadas' },
  { command: 'cita', label: '📆 Nueva cita', help: 'Crear una cita con un cliente' },
  { command: 'agenda', label: '🗓️ Agenda', help: 'Ver tus citas de hoy, mañana o la semana' },
  { command: 'calendar', label: '🔗 Google Calendar', help: 'Conectar tus citas a Google Calendar', enabled: isCalendarEnabled },
  { command: 'settimezone', label: '🌐 Zona horaria', help: 'Cambiar zona horaria' }
]

/** Acciones que se ofrecen ahora mismo. */
export const menuActions = () =>
  MENU_ACTIONS.filter(({ enabled }) => !enabled || enabled())

const button = ({ command, label }) =>
  Markup.button.callback(label, `menu_${command}`)

export function buildMainMenuKeyboard() {
  const actions = menuActions()
  const rows = []
  for (let i = 0; i < actions.length; i += 2) {
    rows.push(actions.slice(i, i + 2).map(button))
  }
  return { reply_markup: Markup.inlineKeyboard(rows).reply_markup }
}

export const buildCommandHelp = () =>
  menuActions()
    .map(({ command, help }) => `/${command} - ${help}`)
    .join('\n')

/** Órdenes del desplegable "/" de Telegram: las mismas que el menú, más /start para recuperarlo. */
export const menuCommands = () => [
  { command: 'start', description: 'Mostrar el menú principal' },
  ...menuActions().map(({ command, help }) => ({
    command,
    description: help
  }))
]

/**
 * Envía el menú principal y retira el anterior: solo hay uno vivo y es el
 * último del chat. No lleva plazo de borrado: cuando el chat se limpia, es lo
 * que le queda al usuario. Lanza si el usuario no está autorizado.
 */
export async function sendMainMenu(ctx) {
  const username =
    ctx.from?.username ||
    ctx.from?.first_name ||
    ctx.from?.last_name ||
    'El/la Sin nombre'
  const userTimezone = await getUserTimezone(ctx.from.id)
  const tzMessage =
    userTimezone === 'Europe/Madrid'
      ? '🌐 Estás usando la zona horaria por defecto: <b>Europe/Madrid</b>.'
      : `🌐 Tu zona horaria actual es: <b>${userTimezone}</b>.`

  // Primero envío el nuevo: si falla, el usuario conserva el menú anterior
  const previousId = ctx.session?.startMessageId
  const msg = await safeReply(
    ctx,
    `🛡️ ¡Hola, ${escapeHtml(username)}!\n` +
      'TuttoFatto está listo para ayudarte.\n\n' +
      `${tzMessage}\n\n` +
      '🧹 Este chat se limpia solo: los avisos y las listas desaparecen pasado un rato, y solo puedes escribir cuando un botón te lo pida.\n\n' +
      '¿Qué quieres hacer? Pulsa un botón o usa un comando:\n' +
      buildCommandHelp(),
    { parse_mode: 'HTML', ...buildMainMenuKeyboard() }
  )
  if (ctx.session) {
    ctx.session.startMessageId = msg?.message_id
  }
  await deleteNow(ctx, previousId)
  return msg
}

/** Estado vacío con atajo a crear una tarea: nunca un callejón sin salida. */
export function replyEmptyState(ctx, text) {
  const add = MENU_ACTIONS[0]
  return replyInterface(ctx, text, {
    reply_markup: Markup.inlineKeyboard([[button(add)]]).reply_markup
  })
}
