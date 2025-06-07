import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    console.info('Estamos intentando conectarnos a MongoDB')
    await mongoose.connect(process.env.MONGO_URI)
    console.info(`👾 MongoDB conectando en: ${mongoose.connection.host}`)
  } catch (error) {
    console.error(
      `🦽 Nos está fallando la conexión a MongoDB: ${error.message}`
    )
    process.exit(1)
  }
}

export default connectDB
