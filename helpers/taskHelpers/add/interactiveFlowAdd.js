import { Markup } from 'telegraf'
import { RecurrenceTemplate } from '../../../models/recurrenceTemplate'

// 1. El primer paso es mostrar las plantillas existentes + "Nueva plantilla"
export async function buildAddMenu(ctx) {
  const userId = ctx.from.id
  const templates = await RecurrenceTemplate.find({
    userId,
    active: true
  }).sort({ name: 1 })
  const buttons = templates.map((tpl) => [
    Markup.button.callback(tpl.name, `add_tpl_${tpl._id}`)
  ])
  buttons.push([Markup.button.callback('Nueva plantilla', 'add_tpl_new')])
  return {
    text: 'Selecciona una plantilla existente o crea una nueva:',
    reply_markup: Markup.inlineKeyboard(buttons, { columns: 1 }).reply_markup
  }
}

// 2. Segundo paso es preguntar el nombre de la nueva plantilla
export function buildName() {
  return {
    text: 'Ingresa el nombre de la nueva plantilla:',
    reply_markup: { force_reply: true }
  }
}

// 3. Tercer paso es preguntar la descripción
export function buildDesc() {
  return {
    text: 'Envía la descripción',
    reply_markup: { force_reply: true }
  }
}
