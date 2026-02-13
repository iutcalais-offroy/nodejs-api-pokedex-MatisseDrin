import { Request, Response, Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../database'

export const authRouter = Router()

/**
 * Route d'inscription d'un nouvel utilisateur
 *
 * Crée un nouveau compte utilisateur avec un mot de passe hashé (bcrypt)
 * et retourne un token JWT valide pour 7 jours.
 *
 * @route POST /auth/sign-up
 * @access Public
 *
 * @param {string} req.body.username - Nom d'utilisateur
 * @param {string} req.body.email - Adresse email (unique)
 * @param {string} req.body.password - Mot de passe (sera hashé)
 *
 * @returns {201} Utilisateur créé avec succès - Retourne le token JWT et les infos utilisateur
 * @returns {400} Tous les champs sont requis - Champs manquants
 * @returns {409} Un utilisateur avec cet email existe déjà - Email déjà utilisé
 * @returns {500} Erreur serveur - Erreur lors de la création
 *
 * @example
 * // Body:
 * {
 *   "username": "john_doe",
 *   "email": "john@example.com",
 *   "password": "securePassword123"
 * }
 *
 * // Réponse 201:
 * {
 *   "message": "Utilisateur créé avec succès",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {"id": 1, "username": "john_doe", "email": "john@example.com"}
 * }
 */
authRouter.post('/sign-up', async (req: Request, res: Response) => {
  const { username, email, password } = req.body

  try {
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({
          error: 'Tous les champs sont requis (username, email, password)',
        })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res
        .status(409)
        .json({ error: 'Un utilisateur avec cet email existe déjà' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    })

    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }, // Le token expire dans 7 jours
    )

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/**
 * Route de connexion utilisateur
 *
 * Authentifie un utilisateur existant en vérifiant son email et mot de passe,
 * puis retourne un token JWT valide pour 7 jours.
 *
 * @route POST /auth/sign-in
 * @access Public
 *
 * @param {string} req.body.email - Adresse email de l'utilisateur
 * @param {string} req.body.password - Mot de passe de l'utilisateur
 *
 * @returns {200} Connexion réussie - Retourne le token JWT et les infos utilisateur
 * @returns {400} Tous les champs sont requis - Email ou mot de passe manquant
 * @returns {401} Email ou mot de passe incorrect - Identifiants invalides
 * @returns {500} Erreur serveur - Erreur lors de la connexion
 *
 * @example
 * // Body:
 * {
 *   "email": "john@example.com",
 *   "password": "securePassword123"
 * }
 *
 * // Réponse 200:
 * {
 *   "message": "Connexion réussie",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {"id": 1, "username": "john_doe", "email": "john@example.com"}
 * }
 */
authRouter.post('/sign-in', async (req: Request, res: Response) => {
  const { email, password } = req.body

  try {
    // Validation des champs requis
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Tous les champs sont requis (email, password)' })
    }

    // 1. Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // 2. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // 3. Générer le JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }, // Le token expire dans 7 jours
    )

    // 4. Retourner le token
    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
