import mongoose from 'mongoose'

// Sesión de Telegraf de cada usuario autorizado (_id = userId de Telegram).
// Vive en Mongo porque el disco de Render se borra en cada despliegue y
// reinicio. El índice TTL elimina las sesiones sin actividad en 30 días.
const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
  },
  { versionKey: false }
)

export const Session = mongoose.model('Session', sessionSchema)
