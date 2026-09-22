// Importo todos los subcontroladores validados que gestionan cada comando del bot

import { listTasks } from './listTask.js'
import { completeTask } from './completeTask.js'
import { deleteTask } from './deleteTask.js'
import { clearTask } from './clearTask.js'

// Exporto los controladores organizados para ser utilizados desde app.js

export default {
  listTasks,
  completeTask,
  deleteTask,
  clearTask
}
