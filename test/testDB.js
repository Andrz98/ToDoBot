import dotenv from 'dotenv'
import connectDB from '../config/db.js'

dotenv.config()

const testConnection = async () => {
  try {
    await connectDB()
    console.log('😁 Lo conseguimos, la conexión a MongoDB exitosa')
    process.exit(0)
  } catch (error) {
    console.error('😒 Tuvimos un Error conectando a MongoDB:', error)
    process.exit(1)
  }
}

testConnection()
