import mongoose from 'mongoose'

// Copia durable de los borrados diferidos en memoria: sobrevive a un reinicio
const pendingDeletionSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  deleteAt: { type: Date, required: true, index: true }
})

pendingDeletionSchema.index({ chatId: 1, messageId: 1 }, { unique: true })

// messageLifecycle.js es una utilidad de bajo nivel que casi todo el bot
// importa, incluidos módulos que en tests se cargan sin mockear este modelo:
// reutilizar el modelo ya compilado evita el OverwriteModelError de Mongoose
// cuando el archivo se vuelve a evaluar en el mismo proceso.
export const PendingDeletion =
  mongoose.models.PendingDeletion ||
  mongoose.model('PendingDeletion', pendingDeletionSchema)
