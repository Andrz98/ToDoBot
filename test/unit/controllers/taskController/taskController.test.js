import taskController from '@/controllers/taskControllers/taskController.js'

describe('taskController', () => {
  it('should export all expected task functions', () => {
    expect(taskController).toHaveProperty('addTask')
    expect(taskController).toHaveProperty('listTasks')
    expect(taskController).toHaveProperty('completeTask')
    expect(taskController).toHaveProperty('deleteTask')
    expect(taskController).toHaveProperty('editTask')
    expect(taskController).toHaveProperty('clearTask')
  })

  it('should export functions for each command', () => {
    for (const key in taskController) {
      expect(typeof taskController[key]).toBe('function')
    }
  })
})
