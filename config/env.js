// Carga .env sin el mensaje que dotenv >= 17 imprime en cada arranque
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
