import { Request } from "express"

export const AUTH_COOKIE_NAME = "next-auth.session-token"
export const API_INTERNAL_HEADER = "x-internal-api-secret"

const isProduction = process.env.NODE_ENV === "production"

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
  maxAge: 60 * 60 * 1000,
})

export const serializeSafeUser = (user: {
  id: string
  email: string
  name: string
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
})

type AuthHeaders = {
  authorization?: string
  cookie?: string
  "x-internal-api-secret"?: string
}

const getTokenFromHeaders = (headers: AuthHeaders) => {
  const authHeader = headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1]
  }

  const cookieHeader = headers.cookie
  if (!cookieHeader) {
    return null
  }

  const cookieToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=")

  return cookieToken ?? null
}

export const getTokenFromRequest = (req: Request) =>
  getTokenFromHeaders(req.headers)

export const getTokenFromHandshake = (headers: AuthHeaders) =>
  getTokenFromHeaders(headers)

export const isInternalApiRequest = (headers: AuthHeaders) => {
  const expectedSecret = process.env.API_INTERNAL_SECRET
  if (!expectedSecret) {
    return false
  }

  return headers["x-internal-api-secret"] === expectedSecret
}
