import { Task } from '../../models/task.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { updateTaskFields } from '../../helpers/taskHelpers/edit/updateTaskFields.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
import { escapeHtml } from '../../utils/textUtils/escapeHtml.js'
import {
  renderInterface,
  closeInterface
} from '../../utils/telegramUtils/flowMessages.js'

const MENU_HINT = 'Selecciona otro campo o pulsa "Guardar" para finalizar.'

export const isEditActive = (ctx) =>
  ctx.session?.flowType === 'edit' && Boolean(ctx.session.editing)

export function resetEditSession(ctx) {
  delete ctx.session.flowType
  delete ctx.session.editing
  delete ctx.session.edits
  delete ctx.session.awaiting
  delete ctx.session.timezone
}

// La sesión se serializa a JSON: la fecha pendiente puede volver como string
const pendingEdits = (ctx) => {
  const edits = { ...ctx.session.edits }
  if (edits.date) {
    edits.date = new Date(edits.date)
  }
  return edits
}

/**
 * Tarea de BD con los cambios pendientes aplicados (sin guardar).
 * @returns {Promise<{ task: object|null, updated: boolean }>}
 */
export async function loadEditedTask(ctx, timezone) {
  const task = await Task.findById(ctx.session.editing.id)
  if (!task) {
    return { task: null, updated: false }
  }
  const { updated } = updateTaskFields(task, pendingEdits(ctx), timezone)
  return { task, updated }
}

async function closeNotFound(ctx) {
  const { oldName } = ctx.session.editing
  resetEditSession(ctx)
  return closeInterface(
    ctx,
    `🤯 No se encontró ninguna tarea llamada "${escapeHtml(oldName)}"`,
    { parse_mode: 'HTML' }
  )
}

export function renderEditMenu(ctx, task, timezone, banner) {
  ctx.session.awaiting = null
  const hasEdits = Object.keys(ctx.session.edits ?? {}).length > 0
  const { text, markup } = buildEditMenu(task, timezone, hasEdits)
  const body = banner ? `${banner}\n\n${text}\n\n${MENU_HINT}` : text
  return renderInterface(ctx, body, { parse_mode: 'HTML', ...markup })
}

/** Vuelve a pintar el menú de edición con los cambios pendientes. */
export async function showEditMenu(ctx) {
  const timezone = await getUserTimezone(ctx.from.id)
  const { task } = await loadEditedTask(ctx, timezone)
  if (!task) {
    return closeNotFound(ctx)
  }
  return renderEditMenu(ctx, task, timezone)
}

/**
 * Aplica un cambio al menú de edición (sin guardar todavía en BD).
 * @param {(task, timezone) => object|null} buildFields – campos a cambiar, o null si la entrada no es válida
 * @returns {Promise<boolean>} false si la entrada no era válida
 * @throws {Error} 'PAST_DATE' si la nueva fecha ya pasó
 */
export async function applyEdit(ctx, buildFields) {
  const timezone = await getUserTimezone(ctx.from.id)
  const { task } = await loadEditedTask(ctx, timezone)
  if (!task) {
    await closeNotFound(ctx)
    return true
  }

  const fields = buildFields(task, timezone)
  if (!fields) {
    return false
  }

  const { updated, changes } = updateTaskFields(task, fields, timezone)
  if (updated) {
    ctx.session.edits = { ...ctx.session.edits, ...fields }
  }
  const banner = updated
    ? `Cambio aplicado:\n${changes.join('\n')}`
    : 'ℹ️ No hubo cambios.'
  await renderEditMenu(ctx, task, timezone, banner)
  return true
}
