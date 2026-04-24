const DEFAULT_DEV_ORIGINS = ["http://localhost:3000"]

export const getAllowedOrigins = () => {
  const rawOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? ""

  const configuredOrigins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_DEV_ORIGINS
}

export const isOriginAllowed = (origin?: string) => {
  if (!origin) {
    return false
  }

  return getAllowedOrigins().includes(origin)
}

export const hasAllowedOriginHeader = (origin?: string, referer?: string) => {
  if (origin && isOriginAllowed(origin)) {
    return true
  }

  if (!referer) {
    return false
  }

  try {
    return isOriginAllowed(new URL(referer).origin)
  } catch {
    return false
  }
}
