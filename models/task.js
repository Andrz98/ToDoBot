import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  userId: { type: Number, required: true }, // ID del usuario de telegram
  name: { type: String, required: true }, // Nombre de la tarea
  description: { type: String, required: false }, // Descripción de la tarea
  completed: { type: Boolean, default: false }, // Estado de la tarea
  reminderAt: { type: Date }, // Fecha/hora del recordatorio
  createdAt: { type: Date, default: Date.now }, // Fecha de creación
  alertsSent: { type: [String], default: [] } //  alertas ya enviadas
})

// Añado un índice compuesto: userId + name deben de ser únicos en combinación
taskSchema.index({ userId: 1, name: 1 }, { unique: true })
export const Task = mongoose.model('Task', taskSchema)
