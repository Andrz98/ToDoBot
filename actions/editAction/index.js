// actions/editAction/index.js

import { registerStartEditAction } from './startEditAction.js'
import { registerFieldEditActions } from './fieldEditActions.js'
import { registerMessageEditHandler } from './messageEditHandler.js'
import { registerSaveEditAction } from './saveEditAction.js'

/**
 * Agrega al bot todos los pasos del flujo /edit:
 * 1) Arrancar flujo (/edit + selector)
 * 2) Manejar selección de campo
 * 3) Capturar respuestas force-reply
 * 4) Guardar cambios
 */
export function registerEditActions(bot) {
  registerStartEditAction(bot)
  registerFieldEditActions(bot)
  registerMessageEditHandler(bot)
  registerSaveEditAction(bot)
}
