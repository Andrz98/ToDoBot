import mongoose from 'mongoose'

const authorizedUserSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true }, // ID de telegram
  username: { type: String, required: true }, // Nombre de usuario en Telegram, no es único, por lo tanto siempre debe estar actualizado

  addedAt: { type: Date, default: Date.now } // Fecha de autorización
})

export const AuthorizedUser = mongoose.model(
  'AuthorizedUser',
  authorizedUserSchema
)
