import cron from 'node-cron'
import { PendingDeletion } from '../../models/pendingDeletion.js'
import { safeDeleteMessage } from '../../utils/telegramUtils/safeDeleteMessage.js'
import { recoverPendingDeletions } from '../../utils/telegramUtils/messageLifecycle.js'

/**
 * Red de seguridad para los borrados diferidos (ver messageLifecycle.js): el
 * temporizador en memoria de cada mensaje es la vía normal, esto solo cubre
 * el caso raro de que uno se pierda sin que el proceso se haya reiniciado.
 */
async function sweepOverdueDeletions(bot) {
  const overdue = await PendingDeletion.find({
    deleteAt: { $lte: new Date() }
  }).lean()

  for (const { chatId, messageId } of overdue) {
    await safeDeleteMessage({ telegram: bot.telegram }, chatId, messageId)
    await PendingDeletion.deleteOne({ chatId, messageId }).catch(() => {})
  }
}

/**
 * Al arrancar: recupera y rearma los borrados pendientes de antes de caer.
 * Después: barre cada minuto cualquier borrado vencido que se haya escapado.
 */
export async function startPendingDeletionScheduler(bot) {
  await recoverPendingDeletions(bot)

  cron.schedule('* * * * *', async () => {
    try {
      await sweepOverdueDeletions(bot)
    } catch (error) {
      console.error('😵‍💫 Error al barrer borrados pendientes:', error.message)
    }
  })
}
