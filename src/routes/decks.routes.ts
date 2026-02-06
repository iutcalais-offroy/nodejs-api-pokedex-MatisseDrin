import {Router} from 'express'
import {decksController} from '../controllers/decks.controller'
import {authenticateToken} from '../middlewares/auth.middleware'

export const decksRouter = Router()

// POST /decks - Créer un nouveau deck pour l'utilisateur authentifié
decksRouter.post('/', authenticateToken, (req, res) => decksController.createDeck(req, res))

// GET /decks - Récupérer tous les decks de l'utilisateur authentifié
decksRouter.get('/mine', authenticateToken, (req, res) => decksController.getDecksByUserId(req, res))

// GET /decks/:id - Récupérer un deck spécifique par son ID pour l'utilisateur authentifié
decksRouter.get('/:id', authenticateToken, (req, res) => decksController.getDeckById(req, res))

// PATCH /decks/:id - Mettre à jour un deck spécifique par son ID pour l'utilisateur authentifié
decksRouter.patch('/:id', authenticateToken, (req, res) => decksController.patchDeck(req, res))

// DELETE /decks/:id - Supprimer un deck spécifique par son ID pour l'utilisateur authentifié
decksRouter.delete('/:id', authenticateToken, (req, res) => decksController.deleteDeck(req, res))