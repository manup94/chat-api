import { Server, Socket } from "socket.io"
import { Server as HttpServer } from "http"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"
import { sendMessageSchema, SendMessageData } from "../models/validation-schemas/message.schema"
import { areUsersFriends } from "../lib/friendship"

interface CustomSocket extends Socket {
  userId?: string
}

export const socketInit = (server: HttpServer, prisma: PrismaClient) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Mapeo de userId a socketId
  const userSocketMap = new Map<string, string>()

  // Middleware de autenticación
  io.use((socket: CustomSocket, next) => {
    // Intentar obtener el token desde la cookie (típicamente llamada next-auth.session-token)
    // Nota: socket.handshake.headers.cookie es un string con todas las cookies
    const cookies = socket.handshake.headers.cookie;
    
    // Necesitaremos extraer el token manualmente o usar una librería como 'cookie'
    // Por ahora, asumimos que el token es enviado en la cabecera auth o cookie
    const token = socket.handshake.auth.token || 
                  cookies?.split('; ').find(row => row.startsWith('next-auth.session-token='))?.split('=')[1];

    console.log("Token detectado en handshake:", token ? "EXISTE" : "VACÍO");

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "") as { id: string };
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error("Error validando token:", err);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: CustomSocket) => {
    const userId = socket.userId!
    console.log(`User connected: ${userId} with socket ID: ${socket.id}`)

    // Registrar el socket del usuario
    userSocketMap.set(userId, socket.id)

    socket.on("sendMessage", async (data: SendMessageData) => {
      console.log("Evento sendMessage recibido con datos:", data);
      try {
        // Validar datos con Zod
        const validation = sendMessageSchema.safeParse(data)
        if (!validation.success) {
          console.error("Error de validación Zod:", validation.error.errors)
          socket.emit("error", { message: "Invalid message data", errors: validation.error.errors })
          return
        }

        const { content, receiverId } = validation.data
        const actualSenderId = socket.userId!

        const usersAreFriends = await areUsersFriends(
          prisma,
          actualSenderId,
          receiverId
        )
        if (!usersAreFriends) {
          socket.emit("error", {
            message: "You can only send messages to accepted friends",
          })
          return
        }

        const message = await prisma.message.create({
          data: {
            content,
            sender: { connect: { id: actualSenderId } },
            receiver: { connect: { id: receiverId } },
          },
        })
        const receiverSocketId = userSocketMap.get(receiverId)
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", message)
        }

        socket.emit("messageSent", message)

      } catch (error) {
        console.error("Error crítico procesando sendMessage:", error)
        socket.emit("error", { message: "Internal server error while sending message" })
      }
    })

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`)
      // Limpiar el mapa de usuarios
      if (userSocketMap.get(userId) === socket.id) {
        userSocketMap.delete(userId)
      }
    })
  })
}
