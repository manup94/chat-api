const DEFAULT_DEV_ORIGINS = ["http://localhost:3000"]

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const getConfiguredOrigins = () => {
  const rawOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? ""

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const getConfiguredOriginPatterns = () => {
  const rawPatterns = process.env.FRONTEND_ORIGIN_PATTERNS ?? ""

  return rawPatterns
    .split(",")
    .map((pattern) => pattern.trim())
    .filter(Boolean)
}

const matchesOriginPattern = (origin: string, pattern: string) => {
  const regexPattern = `^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`
  return new RegExp(regexPattern).test(origin)
}

export const getAllowedOrigins = () => {
  const configuredOrigins = getConfiguredOrigins()

  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_DEV_ORIGINS
}

export const isOriginAllowed = (origin?: string) => {
  if (!origin) {
    return false
  }

  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.includes(origin)) {
    return true
  }

  return getConfiguredOriginPatterns().some((pattern) =>
    matchesOriginPattern(origin, pattern)
  )
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
