import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'

const app: Application = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'NeoVerify API running 🚀' })
})

// Example Route (to expand later)
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from NeoVerify backend!' })
})

export default app
