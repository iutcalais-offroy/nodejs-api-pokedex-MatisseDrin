import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

// Étendre le type Request pour ajouter userId
declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
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
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
