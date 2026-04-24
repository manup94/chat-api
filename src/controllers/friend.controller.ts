import { Status } from "@prisma/client"
import { Request, Response } from "express"
import { prisma } from "../prisma/index"
import {
  friendRequestSchema,
  updateFriendRequestSchema,
} from "../models/validation-schemas/friend-request.schema"
import { findFriendRequestBetweenUsers } from "../lib/friendship"

export const sendFriendRequest = async (req: Request, res: Response) => {
  const result = friendRequestSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { email } = result.data
  const senderId = (req as any).user.id
  const receiver = await prisma.user.findUnique({ where: { email } })

  if (!receiver) {
    return res.status(404).json({ error: "User not found" })
  }

  if (receiver.id === senderId) {
    return res
      .status(400)
      .json({ error: "You cannot send a friend request to yourself" })
  }

  try {
    const existingRequest = await findFriendRequestBetweenUsers(
      prisma,
      senderId,
      receiver.id
    )

    if (existingRequest?.status === Status.ACCEPTED) {
      return res.status(409).json({ error: "Users are already friends" })
    }

    if (existingRequest?.status === Status.PENDING) {
      return res
        .status(409)
        .json({ error: "There is already a pending friend request" })
    }

    if (existingRequest?.status === Status.REJECTED) {
      const request = await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: {
          senderId,
          receiverId: receiver.id,
          status: Status.PENDING,
        },
      })

      return res.status(201).json(request)
    }

    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId: receiver.id, status: Status.PENDING },
    })

    res.status(201).json(request)
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "There is already a pending friend request" })
    }

    console.error("[sendFriendRequest] Database error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export const getFriendRequests = async (req: Request, res: Response) => {
  const userId = (req as any).user.id

  const requests = await prisma.friendRequest.findMany({
    where: {
      receiverId: userId,
      status: Status.PENDING,
      NOT: { senderId: userId },
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const formattedRequests = requests.map((request) => ({
    id: request.id,
    senderId: request.senderId,
    receiverId: request.receiverId,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    sender: request.sender,
    senderName: request.sender.name,
  }))

  res.json(formattedRequests)
}

export const updateFriendRequest = async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const currentUserId = (req as any).user.id
  const result = updateFriendRequestSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    })
  }

  const existingRequest = await prisma.friendRequest.findUnique({
    where: { id },
  })

  if (!existingRequest) {
    return res.status(404).json({ error: "Friend request not found" })
  }

  if (existingRequest.receiverId !== currentUserId) {
    return res.status(403).json({ error: "Not allowed to update this request" })
  }

  if (existingRequest.status !== Status.PENDING) {
    return res
      .status(409)
      .json({ error: "Only pending requests can be updated" })
  }

  const request = await prisma.friendRequest.update({
    where: { id },
    data: { status: result.data.status },
  })

  res.json(request)
}

export const getFriends = async (req: Request, res: Response) => {
  const userId = (req as any).user.id

  const friendships = await prisma.friendRequest.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: Status.ACCEPTED,
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  const uniqueFriends = new Map<string, {
    id: string
    name: string
    email: string
    status: "online"
    lastMessage?: string
    lastActivityAt?: string
  }>()

  const friendIds = friendships.map((friendship) =>
    friendship.senderId === userId ? friendship.receiverId : friendship.senderId
  )

  const latestMessages = friendIds.length
    ? await prisma.message.findMany({
        where: {
          OR: friendIds.flatMap((friendId) => [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId },
          ]),
        },
        orderBy: {
          timestamp: "desc",
        },
      })
    : []

  const latestMessageByFriendId = new Map<
    string,
    { content: string; timestamp: string }
  >()

  latestMessages.forEach((message) => {
    const friendId =
      message.senderId === userId ? message.receiverId : message.senderId

    if (!latestMessageByFriendId.has(friendId)) {
      latestMessageByFriendId.set(friendId, {
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      })
    }
  })

  friendships.forEach((friendship) => {
    const friend =
      friendship.senderId === userId ? friendship.receiver : friendship.sender
    const latestMessage = latestMessageByFriendId.get(friend.id)

    uniqueFriends.set(friend.id, {
      id: friend.id,
      name: friend.name,
      email: friend.email,
      status: "online",
      lastMessage: latestMessage?.content,
      lastActivityAt: latestMessage?.timestamp,
    })
  })

  res.json(Array.from(uniqueFriends.values()))
}
