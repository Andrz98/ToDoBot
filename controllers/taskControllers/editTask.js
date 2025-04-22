// controllers/taskControllers/editTask.js
import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { findTaskForController } from '../../helpers/userTaskBynameController/findTaskForController.js'
import { keyValueParser } from '../../helpers/edit/keyValueParser.js'
import { buildEditMenu } from '../../helpers/edit/interactiveFlow.js'
import { updateTaskFields } from '../../helpers/edit/updateTaskFields.js'
import { getUserTimezone } from '../../helpers/userTimezone/getUserTimezone.js'
import { replyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'

/**
 * Controlador para editar una tarea (/edit).
 *
 * Soporta dos modos:
 * 1) Flujo rápido con sintaxis key:value
 * 2) Flujo interactivo guiado con botones inline
 *
 * @param {object} ctx - Contexto de Telegraf
 * @returns {Promise<object>}
 */
export const editTask = async (ctx) => {
  // 0) Validación básica del contexto
  const text = ctx.message?.text
  const userId = ctx.from?.id
  if (!text || !userId) {
    // Mensaje genérico para entrada inválida
    return replyMessages.invalidInput(ctx)
  }

  // 1) Verificación de autorización
  if (!(await isUserAuthorized(ctx))) {
    // Mensaje genérico de no autorizado
    return replyMessages.unauthorized(ctx)
  }

  // 2) Intento de flujo rápido (key:value)
  //    e.g. /edit old:Comprarpan name:"Comprar pan" desc:"..." date:22/04/25 19:00
  const parsed = keyValueParser(text)
  if (parsed.isValid) {
    const { oldName, newName, newDescription, date } = parsed

    // 2.1) Buscar la tarea original
    const task = await findTaskForController(userId, oldName)
    if (!task) {
      return ctx.reply(
        `🤯 No se encontró ninguna tarea llamada "${oldName}".`,
        { parse_mode: 'HTML' }
      )
    }

    // 2.2) Obtener zona horaria del usuario
    const tz = await getUserTimezone(userId)

    try {
      // 2.3) Aplicar cambios
      const { updated, changes } = updateTaskFields(
        task,
        { newName, newDescription, date },
        tz
      )
      if (!updated) {
        return ctx.reply('⚠️ No se detectaron cambios para aplicar.', {
          parse_mode: 'HTML'
        })
      }

      // 2.4) Guardar y responder éxito
      await task.save()
      const list = changes.map((c) => ` ${c}`).join('\n')
      return ctx.reply(` Tarea actualizada correctamente:\n${list}`, {
        parse_mode: 'HTML'
      })
    } catch (err) {
      // 2.5) Manejo de fecha pasada
      if (err.message === 'PAST_DATE') {
        return ctx.reply(
          ' La fecha que intentas establecer ya pasó. Elige una fecha futura.',
          { parse_mode: 'HTML' }
        )
      }
      console.error('Error rápido /edit:', err)
      // Mensaje genérico de error
      return replyMessages.generalError(ctx)
    }
  }

  // 3) Flujo interactivo: solo "/edit <oldName>"
  //    e.g. /edit Comprar pan
  const oldName = text.replace(/^\/edit\s*/i, '').trim()
  if (!oldName) {
    // Ayuda específica de /edit
    return ctx.reply(
      '🧾 <b>Cómo usar /edit</b>\n\n' +
        'Envía <code>/edit NombreAntiguo</code> para abrir el menú interactivo con opciones:\n' +
        '• 🔺 Nombre\n' +
        '• 🔸 Descripción\n' +
        '• 🔹 Fecha\n' +
        '• ✖️ Cancelar/terminar\n',
      { parse_mode: 'HTML' }
    )
  }

  // 3.1) Buscar la tarea original
  const task = await findTaskForController(userId, oldName)
  if (!task) {
    return ctx.reply(`🤯 No se encontró ninguna tarea llamada "${oldName}".`, {
      parse_mode: 'HTML'
    })
  }

  // 3.2) Iniciar sesión interactiva
  ctx.session.editing = { id: task._id, oldName }
  ctx.session.awaiting = null

  // 3.3) Construir y enviar el menú inline
  const tz = await getUserTimezone(userId)
  const { text: menuText, markup } = buildEditMenu(task, tz)
  return ctx.reply(menuText, {
    parse_mode: 'HTML',
    ...markup
  })
}
