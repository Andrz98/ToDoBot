import { registerStartEditAction } from './startEditAction.js'
import { registerFieldEditActions } from './fieldEditActions.js'
import { registerMessageEditHandler } from './messageEditHandler.js'
import { registerSaveEditAction } from './saveEditAction.js'

export function registerEditActions(bot) {
  registerStartEditAction(bot)
  registerFieldEditActions(bot)
  registerMessageEditHandler(bot)
  registerSaveEditAction(bot)
}
