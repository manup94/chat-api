import jwt from "jsonwebtoken"
import { AuthenticatedRequest } from "@/routes"
import { NextFunction, Request, RequestHandler, Response } from "express"
import { getTokenFromRequest } from "@/lib/auth"

export const authenticateUser: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = getTokenFromRequest(req)
  if (!token) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "") as {
      id: string
    }
    ;(req as AuthenticatedRequest).user = {
      id: (decoded as any).id,
    }
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
