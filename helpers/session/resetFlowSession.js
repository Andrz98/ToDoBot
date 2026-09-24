/** Limpia todo el estado de un flujo interactivo (comandos /add, /edit, /delete…). */
export function resetFlowSession(session) {
  if (!session) {
    return
  }
  session.flowType = null
  session.awaiting = null
  session.editing = null
  session.edits = null
  session.pendingTask = null
  session.pendingApt = null
  session.pendingCal = null
  session.pendingDelete = null
  session.pendingComplete = null
  session.pendingTz = null
  session.pendingClearToken = null
  session.timezone = null
  session.flowExpiresAt = null
}
