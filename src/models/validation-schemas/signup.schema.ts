import { z } from "zod"

export const signupSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(80, "El nombre es demasiado largo"),
  email: z.string().email("Email no válido").max(254, "Email demasiado largo"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128, "La contraseña es demasiado larga"),
})
