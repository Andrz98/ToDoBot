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
    reminderMessageId: { type: Number }, // aviso vivo en el chat (uno por tarea)

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

// Las completadas caducan solas a los 30 días de su última modificación
// (/clear las borra antes). Mongo purga cada ~60 s, sin código de aplicación.
export const COMPLETED_TTL_SECONDS = 30 * 24 * 60 * 60
taskSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: COMPLETED_TTL_SECONDS,
    partialFilterExpression: { completed: true }
  }
)

export const Task = mongoose.model('Task', taskSchema)
