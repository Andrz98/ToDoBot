import mongoose from 'mongoose'

/**
 * Instancias diarias/semanales/mensuales/anuales que el planificador generará
 */
const taskInstanceSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurrenceTemplate',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    reminderAt: {
      type: Date,
      required: true,
      index: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed'],
      default: 'pending',
      index: true
    },
    // Limpieza automática de instancias caducadas
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
)

// TTL: borrar instancia tras vencer expiresAt
taskInstanceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const TaskInstance = mongoose.model('TaskInstance', taskInstanceSchema)
