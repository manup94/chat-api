import { NextFunction, Request, RequestHandler, Response } from "express"
import { isInternalApiRequest } from "@/lib/auth"

type KeyGenerator = (req: Request) => string

type RateLimitOptions = {
  windowMs: number
  max: number
  message: string
  keyGenerator?: KeyGenerator
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export const createRateLimiter = ({
  windowMs,
  max,
  message,
  keyGenerator = (req) => req.ip ?? "unknown",
}: RateLimitOptions): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req)
    const now = Date.now()

    if (isInternalApiRequest(req.headers)) {
      next()
      return
    }

    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    if (bucket.count >= max) {
      res.status(429).json({ error: message })
      return
    }

    bucket.count += 1
    buckets.set(key, bucket)
    next()
  }
}
