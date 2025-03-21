import mongoose from 'mongoose'

const authorizedUserSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true }, // ID de telegram
  username: { type: String, requerid: true }, // Nombre de usuario en Telegram (obligatorio)
  addedAt: { type: Date, default: Date.now } // Fecha de autorización
})

export const authorizedUser = mongoose.model(
  'AuthorizedUser',
  authorizedUserSchema
)
