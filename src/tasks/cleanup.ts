import cron from "node-cron"
import { PrismaClient } from "@prisma/client"

export const initCleanupTask = (prisma: PrismaClient) => {
  // Limpieza todos los días a las 00:00
  cron.schedule("0 0 * * *", async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const deleted = await prisma.message.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo,
          },
        },
      })
      console.log(
        `Cleanup Task: Deleted ${deleted.count} messages older than 30 days.`
      )
    } catch (error) {
      console.error("Cleanup Task Error:", error)
    }
  })
}
