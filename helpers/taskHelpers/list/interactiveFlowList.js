import { Markup } from 'telegraf'
import { formatDateEs } from '../date/formatDateEs.js'
import { escapeHtml } from '../../../utils/textUtils/escapeHtml.js'

export const LIST_PAGE_SIZE = 8

const noop = (text) => Markup.button.callback(text, 'list_noop')

/**
 * Una página del listado de /list. Todas las páginas y el detalle se pintan
 * sobre el mismo mensaje.
 * @param {Array<{ _id: string, name: string }>} tasks
 * @param {number} requestedPage – se ajusta al rango válido
 */
export function buildTaskListPage(tasks, requestedPage = 0) {
  const pages = Math.max(1, Math.ceil(tasks.length / LIST_PAGE_SIZE))
  const page = Math.min(Math.max(requestedPage, 0), pages - 1)
  const first = page * LIST_PAGE_SIZE

  const rows = tasks
    .slice(first, first + LIST_PAGE_SIZE)
    .map((t, i) => [
      Markup.button.callback(
        `${first + i + 1}. ${t.name}`,
        `show_task_${t._id}:${page}`
      )
    ])

  if (pages > 1) {
    rows.push([
      page > 0
        ? Markup.button.callback('⬅️', `list_page_${page - 1}`)
        : noop(' '),
      noop(`${page + 1}/${pages}`),
      page < pages - 1
        ? Markup.button.callback('➡️', `list_page_${page + 1}`)
        : noop(' ')
    ])
  }

  const pageLine = pages > 1 ? ` · página ${page + 1}/${pages}` : ''
  return {
    text: `📋 Mis tareas (${tasks.length})${pageLine}\n\nSelecciona una tarea para ver sus detalles:`,
    reply_markup: { inline_keyboard: rows }
  }
}

/** Detalle de una tarea, con vuelta a la página del listado de la que se vino. */
export function buildTaskDetail(task, timezone, page = 0) {
  const descLine = task.description
    ? `\n\n<b>🔸 Descripción:</b>\n${escapeHtml(task.description)}`
    : ''
  const text =
    `<b>${escapeHtml(task.name)}</b>${descLine}` +
    `\n\n<b>🔹 Fecha:</b> ${formatDateEs(task.reminderAt, timezone)}`

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [Markup.button.callback('⬅️ Volver a la lista', `list_page_${page}`)]
      ]
    }
  }
}
