import { NextFunction, Request, Response } from "express"
import { isInternalApiRequest } from "@/lib/auth"
import { hasAllowedOriginHeader } from "@/lib/origins"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export const requireAllowedOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const origin = req.headers.origin
  const referer = req.headers.referer

  if (isInternalApiRequest(req.headers)) {
    next()
    return
  }

  if (!hasAllowedOriginHeader(origin, referer)) {
    res.status(403).json({ error: "Forbidden origin" })
    return
  }

  next()
}
