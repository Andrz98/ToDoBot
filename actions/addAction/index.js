import { registerStartAddAction } from './startAddAction.js'
import { registerFieldActions } from './fieldActions.js'
import { registerMessageHandler } from './messageHandler.js'
import { registerConfirmAction } from './confirmAction.js'

export function registerAddAction(bot) {
  registerStartAddAction(bot)
  registerFieldActions(bot)
  registerMessageHandler(bot)
  registerConfirmAction(bot)
}
