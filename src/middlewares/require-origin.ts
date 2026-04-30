import { NextFunction, Request, Response } from "express"
import { isInternalApiRequest } from "@/lib/auth"
import { hasAllowedOriginHeader } from "@/lib/origins"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export const requireAllowedOrigin = (req: Request, res: Response, next: NextFunction) => {
  // Permitir GET y otros métodos seguros sin validación estricta de origen/referer aquí,
  // confiando en la configuración global de CORS para la seguridad del navegador.
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
