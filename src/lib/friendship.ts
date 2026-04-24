import { PrismaClient, Status } from "@prisma/client"

export const findFriendRequestBetweenUsers = async (
  prisma: PrismaClient,
  userAId: string,
  userBId: string
) =>
  prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
    },
  })

export const areUsersFriends = async (
  prisma: PrismaClient,
  userAId: string,
  userBId: string
) => {
  const friendship = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
      status: Status.ACCEPTED,
    },
  })

  return friendship !== null
}
