import { AuthenticatedRequest } from "@/routes"
import { NextFunction, Request, RequestHandler, Response } from "express"
import jwt from "jsonwebtoken"

export const authenticateUser: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const token = authHeader.split(" ")[1]

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
