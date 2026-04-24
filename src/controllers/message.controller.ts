import { AuthenticatedRequest } from "@/routes"
import { PrismaClient } from "@prisma/client"
import { Response } from "express"
import { areUsersFriends } from "@/lib/friendship"

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  prisma: PrismaClient
) => {
  try {
    const { content, receiverId } = req.body
    const senderId = req.user.id

    if (!content || !receiverId) {
      return res.status(400).json({
        error: `Content and receiverId are required`,
      })
    }

    const usersAreFriends = await areUsersFriends(prisma, senderId, receiverId)
    if (!usersAreFriends) {
      return res.status(403).json({
        error: "You can only send messages to accepted friends",
      })
    }

    const message = await prisma.message.create({
      data: {
        content,
        sender: {
          connect: { id: senderId },
        },
        receiver: {
          connect: { id: receiverId },
        },
      },
    })

    res.status(201).json(message)
  } catch (error) {
    console.error("Error sending message:", error)
    res.status(500).json({ error: "Failed to send message" })
  }
}

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  prisma: PrismaClient
) => {
  try {
    const userId = req.user.id
    const otherUserId = req.params.userId as string

    const usersAreFriends = await areUsersFriends(prisma, userId, otherUserId)
    if (!usersAreFriends) {
      return res.status(403).json({
        error: "You can only access messages with accepted friends",
      })
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: {
        timestamp: "asc",
      },
    })

    res.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}
