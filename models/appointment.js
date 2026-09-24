import mongoose from 'mongoose'
import { STATUS } from '../helpers/appointments/status.js'

// Límites de texto: los comparte el esquema y la validación del flujo /cita
export const FIELD_LIMITS = Object.freeze({
  client: 100,
  location: 200,
  notes: 500
})

// El historial se conserva 90 días tras terminar la cita; después Mongo la purga
export const APPOINTMENT_TTL_SECONDS = 90 * 24 * 60 * 60

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true }, // Dueño de la cita (usuario autorizado)
    client: { type: String, required: true, maxlength: FIELD_LIMITS.client },
    location: { type: String, maxlength: FIELD_LIMITS.location },
    notes: { type: String, maxlength: FIELD_LIMITS.notes },
    startAt: { type: Date, required: true },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value > this.startAt
        },
        message: 'endAt debe ser posterior a startAt'
      }
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.PENDING
    },
    alertsSent: { type: [String], default: [] }, // alertas ya enviadas
    reminderMessageId: { type: Number } // aviso vivo en el chat (uno por cita)
  },
  { timestamps: true }
)

appointmentSchema.index({ userId: 1, startAt: 1 }) // agenda y solapes
appointmentSchema.index(
  { endAt: 1 },
  { expireAfterSeconds: APPOINTMENT_TTL_SECONDS }
)

export const Appointment = mongoose.model('Appointment', appointmentSchema)
