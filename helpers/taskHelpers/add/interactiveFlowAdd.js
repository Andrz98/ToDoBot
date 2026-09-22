import { Markup } from 'telegraf'
import { formatDateEs } from '../../../helpers/taskHelpers/date/formatDateEs.js'

/**
 * Interfaz única del flujo /add: resume lo ya introducido y permite completar
 * o corregir cualquier campo. Hace de confirmación final cuando ya hay nombre y fecha.
 *
 * @param {object} pendingTask – Estado actual de la tarea en construcción
 * @returns {{ text: string, markup: { reply_markup: Object } }}
 */
export function buildAddMenu(pendingTask = {}, timezone = 'Europe/Madrid') {
  const { name, description, reminderAt } = pendingTask
  const date = reminderAt
    ? formatDateEs(new Date(reminderAt), timezone || 'Europe/Madrid')
    : null

  const lines = [
    '📝 Nueva tarea',
    '',
    `🔺 Nombre: ${name ?? '—'}`,
    `🔸 Descripción: ${description ?? '—'}`,
    `🔹 Fecha: ${date ?? '—'}`,
    '',
    name && date
      ? 'Revisa los datos y confirma, o corrige algún campo.'
      : 'Completa los campos obligatorios:'
  ]

  const label = (filled, text) => `${filled ? '✏️' : '➕'} ${text}`
  const keyboard = [
    [Markup.button.callback(label(name, 'Nombre (obligatorio)'), 'add_field_name')],
    [
      Markup.button.callback(
        label(description, 'Descripción (opcional)'),
        'add_field_desc'
      )
    ],
    [Markup.button.callback(label(date, 'Fecha (obligatorio)'), 'add_cal')]
  ]
  if (name && date) {
    keyboard.push([Markup.button.callback('✅ Confirmar creación', 'add_confirm')])
  }
  keyboard.push([Markup.button.callback('✖️ Cancelar', 'add_cancel')])

  return {
    text: lines.join('\n'),
    markup: { reply_markup: Markup.inlineKeyboard(keyboard).reply_markup }
  }
}
