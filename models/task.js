import mongoose from 'mongoose'

const taskSchema = new mongoose.schema({
  userId: { type: Number, requerid: true }, // ID del usuario de telegram
  description: { type: String, required: true }, // Descripción de la tarea
  completed: { type: Boolean, default: false }, // Estado de la tarea
  reminderAt: { type: Date }, // Fecha/hora del recordatorio
  createdAt: { type: Date, default: Date.now } // Fecha de creación
})

export const task = mongoose.model('task', taskSchema)
