import { Markup } from 'telegraf'
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlowEdit.js'
import { getUserTimezone } from '../../helpers/timezone/userTimezone/getUserTimezone.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'
import { findTask } from '../../helpers/tasks/findTask.js'
import { findAllTasks } from '../../helpers/tasks/findAllTasks.js'

/**
 * Controlador para editar una tarea (/edit).
 * Flujo interactivo guiado con botones inline
 */
export const editTask = async (ctx) => {
  const text = ctx.message?.text
  const userId = ctx.from?.id

  // 0) Validación básica del contexto
  if (!text || !userId) {
    return replyMessages.invalidInput(ctx)
  }

  // 1) Verificación de autorización
  if (!(await isUserAuthorized(ctx))) {
    return replyMessages.unauthorized(ctx)
  }

  // Extraigo el nombre de la tarea (parámetro opcional)
  const oldName = text.replace(/^\/edit\s*/i, '').trim()

  // 2.0) Sin parámetro: muestro listado de tareas activas
  if (!oldName) {
    const tasks = await findAllTasks(userId)
    if (tasks.length === 0) {
      return ctx.reply('No tienes tareas activas para editar.')
    }
    const buttons = tasks.map((t) =>
      Markup.button.callback(t.name, `select_edit_${t._id}`)
    )
    return ctx.reply('Selecciona la tarea que quieres editar:', {
      reply_markup: Markup.inlineKeyboard(buttons, { columns: 1 }).reply_markup
    })
  }

  // 2.1) Con parámetro: busco esa tarea y abro menú inline de edición
  const task = await findTask(userId, { name: oldName })
  if (!task) {
    return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${oldName}".`, {
      parse_mode: 'HTML'
    })
  }

  // 2.2) Iniciar flujo interactivo
  ctx.session.editing = { id: task._id, oldName }
  ctx.session.awaiting = null

  // 2.3) Construir y enviar menú inline
  const tz = await getUserTimezone(userId)
  const { text: menuText, markup } = buildEditMenu(task, tz)
  return ctx.reply(menuText, {
    parse_mode: 'HTML',
    ...markup
  })
}
