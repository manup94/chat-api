import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email no válido").max(254, "Email demasiado largo"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128, "La contraseña es demasiado larga"),
})
