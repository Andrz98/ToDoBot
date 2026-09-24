import { Markup } from 'telegraf'
import { replyInterface } from '../../utils/telegramUtils/messageLifecycle.js'
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

/** Estado vacío con atajo a crear una tarea: nunca un callejón sin salida. */
export function replyEmptyState(ctx, text) {
  const add = MENU_ACTIONS[0]
  return replyInterface(ctx, text, {
    reply_markup: Markup.inlineKeyboard([[button(add)]]).reply_markup
  })
}
