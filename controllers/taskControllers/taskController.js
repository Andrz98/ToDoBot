// Importo todos los subcontroladores validados que gestionan cada comando del bot

import { addTask } from './addTask.js'
import { listTasks } from './listTask.js'
import { completeTask } from './completeTask.js'
import { deleteTask } from './deleteTask.js'
import { editTask } from './editTask.js'
import { clearTask } from './clearTask.js'

// Exporto los controladores organizados para ser utilizados desde app.js

export default {
  addTask,
  listTasks,
  completeTask,
  deleteTask,
  editTask,
  clearTask
}
