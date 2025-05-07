import { isUserAuthorized } from '../../helpers/userAuthorizedTaskController/isUserAuthorized.js'
import { buildAddButton } from '../../helpers/taskHelpers/add/addCommand.js'
import { genericReplyMessages } from '../../helpers/replyMessages/genericReplyMessages.js'

export const addTask = async (ctx) => {
  if (!(await isUserAuthorized(ctx))) {
    return genericReplyMessages.unauthorizedUser(ctx)
  }
  const { text, markup } = buildAddButton()
  return ctx.reply(text, markup)
}
