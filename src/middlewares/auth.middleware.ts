import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Socket } from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import { env } from '../env'

// Étendre le type Request pour ajouter userId
declare module 'express-serve-static-core' {
  interface Request {
    userId?: number
  }
}

// Étendre le type Socket pour ajouter les données utilisateur
declare module 'socket.io' {
  interface Socket {
    userId?: number
    email?: string
  }
}

/**
 * Middleware d'authentification JWT
 *
 * Vérifie la validité du token JWT envoyé dans l'en-tête Authorization.
 * Si le token est valide, extrait l'userId et l'ajoute à l'objet Request.
 *
 * @param {Request} req - Objet de requête Express (doit contenir un header Authorization: "Bearer TOKEN")
 * @param {Response} res - Objet de réponse Express
 * @param {NextFunction} next - Fonction pour passer au middleware suivant
 *
 * @returns {Response | void} Retourne une erreur 401 si le token est manquant ou invalide, sinon appelle next()
 *
 * @throws {401} Token manquant - Aucun token trouvé dans l'en-tête Authorization
 * @throws {401} Token invalide ou expiré - Le token est malformé, expiré ou la signature est incorrecte
 *
 * @example
 * // Utilisation dans une route
 * router.get('/protected', authenticateToken, (req, res) => {
 *   console.log(req.userId) // ID de l'utilisateur authentifié
 * })
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number
      email: string
    }

    // 3. Ajouter userId à la requête pour l'utiliser dans les routes
    req.userId = decoded.userId

    // 4. Passer au prochain middleware ou à la route
    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

/**
 * Middleware d'authentification pour Socket.io
 *
 * Vérifie la validité du token JWT envoyé lors de la connexion WebSocket.
 * Si le token est valide, extrait les informations utilisateur et les ajoute au socket.
 *
 * @param {Socket} socket - Socket Socket.io (doit contenir socket.handshake.auth.token)
 * @param {Function} next - Fonction pour autoriser ou refuser la connexion
 *
 * @returns {void} Appelle next() pour autoriser la connexion, ou next(Error) pour la refuser
 *
 * @throws {Error} Token manquant - Aucun token trouvé dans socket.handshake.auth.token
 * @throws {Error} Token invalide ou expiré - Le token est malformé, expiré ou la signature est incorrecte
 *
 * @example
 * // Utilisation dans la configuration Socket.io
 * io.use(authenticateSocket)
 *
 * // Dans un event handler Socket.io
 * socket.on('someEvent', () => {
 *   console.log(socket.userId) // ID de l'utilisateur authentifié
 *   console.log(socket.email) // Email de l'utilisateur authentifié
 * })
 */
export const authenticateSocket = (
  socket: Socket,
  next: (err?: ExtendedError) => void,
) => {
  // 1. Récupérer le token depuis socket.handshake.auth
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error('Token manquant'))
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number
      email: string
    }

    // 3. Ajouter les informations utilisateur au socket
    socket.userId = decoded.userId
    socket.email = decoded.email

    // 4. Autoriser la connexion
    return next()
  } catch {
    return next(new Error('Token invalide ou expiré'))
  }
}
