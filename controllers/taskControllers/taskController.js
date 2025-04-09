// Voy a importar todos los subcontroladores modulares que gestionan cada comando

import { addTask } from './addTask.js'
import { deleteTask } from './deleteTask.js'
import { getTask } from './getTask.js'
import { getTasks } from './getTasks.js'
import { updateTask } from './updateTask.js'

export default {
  addTask,
  deleteTask,
  getTask,
  getTasks,
  updateTask
}
