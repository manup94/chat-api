import { Router, Request, Response } from "express"
import { registerUser, loginUser } from "@/controllers/user.controller"
import { sendMessage, getMessages } from "@/controllers/message.controller"
import { sendFriendRequest, getFriendRequests, updateFriendRequest, getFriends } from "@/controllers/friend.controller"
import { PrismaClient } from "@prisma/client"
import { authenticateUser } from "@/middlewares/auth"
import { createRateLimiter } from "@/lib/rate-limit"
import { requireAllowedOrigin } from "@/middlewares/require-origin"

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
  }
}

const createRouter = (prisma: PrismaClient) => {
  const router = Router()
  const authRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many authentication attempts. Try again later.",
  })
  const signupRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: "Too many signup attempts. Try again later.",
  })
  const messageRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many messages. Slow down.",
    keyGenerator: (req) => {
      const userId = (req as AuthenticatedRequest).user?.id
      return userId ? `user:${userId}` : `ip:${req.ip ?? "unknown"}`
    },
  })
  const friendRequestRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many friend request actions. Try again later.",
    keyGenerator: (req) => {
      const userId = (req as AuthenticatedRequest).user?.id
      return userId ? `user:${userId}` : `ip:${req.ip ?? "unknown"}`
    },
  })

  // Rutas de autenticación
  router.post("/signup", requireAllowedOrigin, signupRateLimit, async (req: Request, res: Response) => {
    await registerUser(req, res, prisma)
  })
  router.post("/login", requireAllowedOrigin, authRateLimit, async (req: Request, res: Response) => {
    await loginUser(req, res, prisma)
  })

  // Ruta para verificar que el servidor está funcionando
  router.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok" })
  })

  // Rutas de mensajes
  router.post(
    "/messages",
    requireAllowedOrigin,
    authenticateUser,
    messageRateLimit,
    async (req: Request, res: Response) => {
      try {
        await sendMessage(req as AuthenticatedRequest, res, prisma)
      } catch (error) {
        res.status(500).json({ error: "Internal Server Error" })
      }
    }
  )

  router.get(
    "/messages/:userId",
    authenticateUser,
    (req: Request, res: Response) =>
      getMessages(req as AuthenticatedRequest, res, prisma)
  )

  // Rutas de amigos
  router.post("/friend-request", requireAllowedOrigin, authenticateUser, friendRequestRateLimit, (req: Request, res: Response) => sendFriendRequest(req as AuthenticatedRequest, res))
  router.get("/friend-requests", authenticateUser, (req: Request, res: Response) => getFriendRequests(req as AuthenticatedRequest, res))
  router.put("/friend-request/:id", requireAllowedOrigin, authenticateUser, friendRequestRateLimit, (req: Request, res: Response) => updateFriendRequest(req as AuthenticatedRequest, res))
  router.get("/friends", authenticateUser, (req: Request, res: Response) => getFriends(req as AuthenticatedRequest, res))
  router.get("/friend-request/confirmed", authenticateUser, (req: Request, res: Response) => getFriends(req as AuthenticatedRequest, res))

  return router
}

export default createRouter
