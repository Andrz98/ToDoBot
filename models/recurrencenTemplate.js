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

    // Parametros según la frecuencia
    // daily: hora o franja horaria
    timeOdDay: {
      type: String,
      default: null
    },
    // weekly: diá de la semana
    dayOfWeek: {
      type: [Number],
      validate: {
        validator: (arr) => arr.every((n) => n >= 1 && n <= 7),
        message: 'daysOfWeek must be between 1 and 7'
      },
      default: []
    },
    // monthly: dia del mes
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    },
    // yearly: mes y día
    monthAndDAy: {
      month: { tyoe: Number, min: 1, max: 12 },
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

// Unico por usuario + nombre + nombre de plantilla
recurrenceTemplateSchema.index({ userId: 1, name: 1 }, { unique: true })

export const recurrenceTemplate = mongoose.model(
  'RecurrenceTemplate',
  recurrenceTemplateSchema
)
