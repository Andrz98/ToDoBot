import { Markup } from 'telegraf'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { buildEditMenu } from '../../helpers/taskHelpers/edit/interactiveFlowEdit.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'
import { safeReply } from '../../utils/retryUtils/safeReply.js'

/**
 * Controlador para editar una tarea (/edit).
 * Flujo interactivo guiado con botones inline.
 */
export const editTask = async (ctx) => {
  const text = ctx.message?.text
  const userId = ctx.from?.id

  // 0. Validación básica del contexto
  if (!text || !userId) {
    return replyMessages.invalidInput(ctx)
  }

  // 1. Verificación de autorización
  if (!(await isUserAuthorized(ctx))) {
    return replyMessages.unauthorized(ctx)
  }

  // 2. Extracción del parámetro (nombre de tarea)
  const oldName = text.replace(/^\/edit\s*/i, '').trim()

  // 2.1 Sin parámetro: mostrar listado de tareas activas
  if (!oldName) {
    const tasks = await findAllTasks(userId)
    if (tasks.length === 0) {
      return safeReply(ctx, 'No tienes tareas activas para editar.')
    }
    const buttons = tasks.map((t) =>
      Markup.button.callback(t.name, `select_edit_${t._id}`)
    )
    return safeReply(ctx, 'Selecciona la tarea que quieres editar:', {
      reply_markup: Markup.inlineKeyboard(buttons, { columns: 1 }).reply_markup
    })
  }

  // 2.2 Con parámetro: buscar tarea por nombre
  const task = await findTask(userId, { name: oldName })
  if (!task) {
    return safeReply(
      ctx,
      `🤯 No se encontró ninguna tarea llamada "${oldName}".`,
      { parse_mode: 'HTML' }
    )
  }

  // 2.3 Iniciar flujo interactivo de edición
  ctx.session.flowType = 'edit'
  ctx.session.editing = { id: task._id, oldName }
  ctx.session.awaiting = null
  ctx.session.edits = {}

  // 2.4 Construir y enviar menú inline (sin botón "Guardar" inicialmente)
  const tz = await getUserTimezone(userId)
  const { text: menuText, markup } = buildEditMenu(task, tz)
  return safeReply(ctx, menuText, { parse_mode: 'HTML', ...markup })
}
