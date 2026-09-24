import { Markup } from 'telegraf'
import { replyInterface } from '../../utils/telegramUtils/messageLifecycle.js'

/** Acciones del menú principal: cada botón `menu_<comando>` equivale al comando. */
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
  { command: 'settimezone', label: '🌐 Zona horaria', help: 'Cambiar zona horaria' }
]

const button = ({ command, label }) =>
  Markup.button.callback(label, `menu_${command}`)

export function buildMainMenuKeyboard() {
  const rows = []
  for (let i = 0; i < MENU_ACTIONS.length; i += 2) {
    rows.push(MENU_ACTIONS.slice(i, i + 2).map(button))
  }
  return { reply_markup: Markup.inlineKeyboard(rows).reply_markup }
}

export const buildCommandHelp = () =>
  MENU_ACTIONS.map(({ command, help }) => `/${command} - ${help}`).join('\n')

/** Estado vacío con atajo a crear una tarea: nunca un callejón sin salida. */
export function replyEmptyState(ctx, text) {
  const add = MENU_ACTIONS[0]
  return replyInterface(ctx, text, {
    reply_markup: Markup.inlineKeyboard([[button(add)]]).reply_markup
  })
}
