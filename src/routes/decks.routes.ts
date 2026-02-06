import { Router } from 'express'
import { decksController } from '../controllers/decks.controller'
import { authenticateToken } from '../middlewares/auth.middleware'

export const decksRouter = Router()

/**
 * Route de création d'un nouveau deck
 *
 * Crée un deck de 10 cartes pour l'utilisateur authentifié.
 *
 * @route POST /decks
 * @access Privé (nécessite authentification JWT)
 *
 * @param {string} req.body.name - Nom du deck
 * @param {number[]} req.body.cards - Tableau de 10 IDs de cartes
 *
 * @returns {201} Deck créé avec succès
 * @returns {400} Données invalides (champs manquants, nombre de cartes incorrect, cartes inexistantes)
 * @returns {401} Non authentifié
 * @returns {500} Erreur serveur
 */
decksRouter.post('/', authenticateToken, (req, res) =>
  decksController.createDeck(req, res),
)

/**
 * Route de récupération de tous les decks de l'utilisateur
 *
 * Retourne la liste de tous les decks appartenant à l'utilisateur authentifié.
 *
 * @route GET /decks/mine
 * @access Privé (nécessite authentification JWT)
 *
 * @returns {200} Liste des decks avec leurs cartes
 * @returns {401} Non authentifié
 * @returns {500} Erreur serveur
 */
decksRouter.get('/mine', authenticateToken, (req, res) =>
  decksController.getDecksByUserId(req, res),
)

/**
 * Route de récupération d'un deck spécifique
 *
 * Retourne les détails d'un deck spécifique avec toutes ses cartes.
 *
 * @route GET /decks/:id
 * @access Privé (nécessite authentification JWT)
 *
 * @param {string} req.params.id - ID du deck
 *
 * @returns {200} Détails du deck avec ses cartes
 * @returns {403} Accès refusé (deck appartient à un autre utilisateur)
 * @returns {404} Deck inexistant
 * @returns {500} Erreur serveur
 */
decksRouter.get('/:id', authenticateToken, (req, res) =>
  decksController.getDeckById(req, res),
)

/**
 * Route de mise à jour d'un deck
 *
 * Met à jour le nom et/ou les cartes d'un deck existant.
 *
 * @route PATCH /decks/:id
 * @access Privé (nécessite authentification JWT)
 *
 * @param {string} req.params.id - ID du deck
 * @param {string} [req.body.name] - Nouveau nom du deck (optionnel)
 * @param {number[]} [req.body.cards] - Nouveau tableau de 10 IDs de cartes (optionnel)
 *
 * @returns {200} Deck mis à jour avec succès
 * @returns {400} Données invalides
 * @returns {403} Accès refusé
 * @returns {404} Deck inexistant
 * @returns {500} Erreur serveur
 */
decksRouter.patch('/:id', authenticateToken, (req, res) =>
  decksController.patchDeck(req, res),
)

/**
 * Route de suppression d'un deck
 *
 * Supprime définitivement un deck et toutes ses associations de cartes.
 *
 * @route DELETE /decks/:id
 * @access Privé (nécessite authentification JWT)
 *
 * @param {string} req.params.id - ID du deck
 *
 * @returns {200} Deck supprimé avec succès
 * @returns {403} Accès refusé
 * @returns {404} Deck inexistant
 * @returns {500} Erreur serveur
 */
decksRouter.delete('/:id', authenticateToken, (req, res) =>
  decksController.deleteDeck(req, res),
)
