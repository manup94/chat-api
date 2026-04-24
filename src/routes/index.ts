import { Router, Request, Response } from "express"
import { registerUser, loginUser } from "@/controllers/user.controller"
import { sendMessage, getMessages } from "@/controllers/message.controller"
import { sendFriendRequest, getFriendRequests, updateFriendRequest, getFriends } from "@/controllers/friend.controller"
import { PrismaClient } from "@prisma/client"
import { authenticateUser } from "@/middlewares/auth"

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
  }
}

const createRouter = (prisma: PrismaClient) => {
  const router = Router()

  // Rutas de autenticación
  router.post("/signup", async (req: Request, res: Response) => {
    await registerUser(req, res, prisma)
  })
  router.post("/login", async (req: Request, res: Response) => {
    await loginUser(req, res, prisma)
  })

  // Ruta para verificar que el servidor está funcionando
  router.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok" })
  })

  // Rutas de mensajes
  router.post(
    "/messages",
    authenticateUser,
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
  router.post("/friend-request", authenticateUser, (req: Request, res: Response) => sendFriendRequest(req as AuthenticatedRequest, res))
  router.get("/friend-requests", authenticateUser, (req: Request, res: Response) => getFriendRequests(req as AuthenticatedRequest, res))
  router.put("/friend-request/:id", authenticateUser, (req: Request, res: Response) => updateFriendRequest(req as AuthenticatedRequest, res))
  router.get("/friends", authenticateUser, (req: Request, res: Response) => getFriends(req as AuthenticatedRequest, res))
  router.get("/friend-request/confirmed", authenticateUser, (req: Request, res: Response) => getFriends(req as AuthenticatedRequest, res))

  return router
}

export default createRouter
