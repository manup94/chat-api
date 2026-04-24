import express from "express"
import cors from "cors"
import { createServer } from "http"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"
import createRouter from "./src/routes"
import { socketInit } from "./src/socket"
import { initCleanupTask } from "./src/tasks/cleanup"

dotenv.config()

const app = express()
const httpServer = createServer(app) // Pass the Express app to createServer

const prisma = new PrismaClient()

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "", // Permitir solicitudes desde tu frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // Métodos permitidos
    credentials: true,
  })
)
app.use(express.json()) // Para parsear JSON en las peticiones

// Rutas
app.use("/api", createRouter(prisma))

// Inicialización de WebSockets
socketInit(httpServer, prisma)

// Inicialización de Tareas
initCleanupTask(prisma)

// Puerto desde variables de entorno o 4000 por defecto
const PORT = process.env.PORT || 4000

// Servidor escuchando en el puerto
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
