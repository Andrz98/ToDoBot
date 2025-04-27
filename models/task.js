import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true }, // ID del usuario de telegram
    name: { type: String, required: true }, // Nombre de la tarea
    description: { type: String }, // Descripción (opcional)
    completed: { type: Boolean, default: false }, // Estado
    reminderAt: { type: Date }, // Recordatorio
    createdAt: { type: Date, default: Date.now }, // Creación
    alertsSent: { type: [String], default: [] }, // alertas ya enviadas

    // Campo de frecuencia para las tareas
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'daily',
      required: true
    }
  },
  {
    timestamps: true
  }
)

taskSchema.index({ userId: 1, name: 1 }, { unique: true })

export const Task = mongoose.model('Task', taskSchema)
