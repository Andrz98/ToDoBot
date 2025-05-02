import mongoose from 'mongoose'

/**
 * Modelo de plantilla de recurrencia
 */
const recurrenceTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true
    },

    // Parámetros según la frecuencia
    // daily: hora o franja horaria
    timeOfDay: {
      type: String,
      default: null
    },
    // weekly: días de la semana (1=Lun … 7=Dom)
    daysOfWeek: {
      type: [Number],
      validate: {
        validator: (arr) => arr.every((n) => n >= 1 && n <= 7),
        message: 'daysOfWeek must be between 1 and 7'
      },
      default: []
    },
    // monthly: día del mes
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    },
    // yearly: mes y día
    monthAndDay: {
      month: { type: Number, min: 1, max: 12 },
      day: { type: Number, min: 1, max: 31 }
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
)

// Único por usuario + nombre de plantilla
recurrenceTemplateSchema.index({ userId: 1, name: 1 }, { unique: true })

export const RecurrenceTemplate = mongoose.model(
  'RecurrenceTemplate',
  recurrenceTemplateSchema
)
