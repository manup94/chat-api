import { loginSchema } from "@/models/validation-schemas/login.schema"
import { signupSchema } from "@/models/validation-schemas/signup.schema"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Request, Response } from "express"
import jwt from "jsonwebtoken"

export const registerUser = async (
  req: Request,
  res: Response,
  prisma: PrismaClient
) => {
  const result = signupSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    })
  }
  const { email, name, password } = req.body

  // Verificar si el usuario ya existe
  const userExists = await prisma.user.findUnique({ where: { email } })
  if (userExists) return res.status(400).json({ error: "User already exists" })

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  })

  // Crear JWT
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  })
  res.json({ user, token })
}

export const loginUser = async (
  req: Request,
  res: Response,
  prisma: PrismaClient
) => {
  const result = loginSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) return res.status(404).json({ error: "User not found" })

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword)
    return res.status(400).json({ error: "Invalid credentials" })

  // Crear JWT
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  })

  res.json({ user, token })
}
