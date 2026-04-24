import express from "express"
import cors from "cors"
import { createServer } from "http"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"
import createRouter from "./src/routes"
import { socketInit } from "./src/socket"
import { initCleanupTask } from "./src/tasks/cleanup"
import { getAllowedOrigins } from "./src/lib/origins"

dotenv.config()

const app = express()
app.set("trust proxy", 1)
app.disable("x-powered-by")
const httpServer = createServer(app) // Pass the Express app to createServer

const prisma = new PrismaClient()

app.use(
  cors({
    origin: getAllowedOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
)
app.use(express.json({ limit: "10kb" }))

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
  console.log(`Server running on port ${PORT}`)
})
