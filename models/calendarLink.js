import mongoose from 'mongoose'

// Un usuario autorizado tiene, como mucho, un calendario de Google compartido con él
const calendarLinkSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true }, // ID de Telegram
    email: { type: String, required: true }, // Cuenta de Google con la que se compartió
    calendarId: { type: String, required: true } // Calendario creado por la cuenta de servicio
  },
  { timestamps: true }
)

export const CalendarLink = mongoose.model('CalendarLink', calendarLinkSchema)
