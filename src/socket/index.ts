import { Server, Socket } from "socket.io"
import { Server as HttpServer } from "http"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"
import { sendMessageSchema, SendMessageData } from "../models/validation-schemas/message.schema"
import { areUsersFriends } from "../lib/friendship"
import { isOriginAllowed } from "../lib/origins"
import { getTokenFromHandshake } from "../lib/auth"

interface CustomSocket extends Socket {
  userId?: string
}

export const socketInit = (server: HttpServer, prisma: PrismaClient) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          callback(null, true)
          return
        }

        callback(new Error(`Origin not allowed: ${origin}`))
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Mapeo de userId a socketId
  const userSocketMap = new Map<string, string>()
  const messageBuckets = new Map<string, { count: number; resetAt: number }>()

  // Middleware de autenticación
  io.use((socket: CustomSocket, next) => {
    const token =
      socket.handshake.auth.token ||
      getTokenFromHandshake({
        authorization: socket.handshake.headers.authorization,
        cookie: socket.handshake.headers.cookie,
      })

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
      try {
        const bucketKey = socket.userId ?? socket.id
        const now = Date.now()
        const bucket = messageBuckets.get(bucketKey)
        if (!bucket || bucket.resetAt <= now) {
          messageBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 })
        } else if (bucket.count >= 30) {
          socket.emit("error", { message: "Too many messages. Slow down." })
          return
        } else {
          bucket.count += 1
          messageBuckets.set(bucketKey, bucket)
        }

        // Validar datos con Zod
        const validation = sendMessageSchema.safeParse(data)
        if (!validation.success) {
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
