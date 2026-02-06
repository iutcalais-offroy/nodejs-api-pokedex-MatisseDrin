import { Request, Response } from 'express'
import { decksService } from '../services/decks.service'

/**
 * Contrôleur de gestion des decks de cartes
 *
 * Gère les requêtes HTTP pour les opérations CRUD sur les decks.
 * Toutes les méthodes nécessitent une authentification JWT (sauf indication contraire).
 */
export class DecksController {
  /**
   * Crée un nouveau deck pour l'utilisateur authentifié
   *
   * @param {Request} req - Requête Express (body: {name: string, cards: number[]}, userId injecté par le middleware)
   * @param {Response} res - Réponse Express
   *
   * @returns {Promise<void>} JSON avec le deck créé (201) ou une erreur
   *
   * @throws {400} Le nom et les cartes sont requis - Champs manquants dans le body
   * @throws {400} Les cartes doivent être un tableau - Format incorrect
   * @throws {400} Un deck doit contenir exactement 10 cartes - Nombre de cartes invalide
   * @throws {400} Certaines cartes n'existent pas - IDs de cartes invalides
   * @throws {401} Utilisateur non authentifié - Token JWT manquant ou invalide
   * @throws {500} Erreur serveur - Erreur inattendue
   *
   * @example
   * // POST /decks
   * // Body: {"name": "Mon Deck", "cards": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
   * // Réponse 201: {"message": "Deck créé avec succès", "deck": {...}}
   */
  async createDeck(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId
      const { name, cards } = req.body

      if (!name || !cards) {
        res.status(400).json({ error: 'Le nom et les cartes sont requis' })
        return
      }

      if (!userId) {
        res.status(401).json({ error: 'Utilisateur non authentifié' })
        return
      }

      if (!Array.isArray(cards)) {
        res.status(400).json({ error: 'Les cartes doivent être un tableau' })
        return
      }

      const newDeck = await decksService.createDeck(userId, name, cards)
      res.status(201).json({
        message: 'Deck créé avec succès',
        deck: newDeck,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'ERREUR_NB_CARTES') {
        res
          .status(400)
          .json({ error: 'Un deck doit contenir exactement 10 cartes' })
        return
      }

      if (
        error instanceof Error &&
        error.message === 'ERREUR_CARTES_INVALIDES'
      ) {
        res.status(400).json({ error: "Certaines cartes n'existent pas" })
        return
      }

      console.error('Erreur lors de la création du deck:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  /**
   * Récupère tous les decks de l'utilisateur authentifié
   *
   * @param {Request} req - Requête Express (userId injecté par le middleware)
   * @param {Response} res - Réponse Express
   *
   * @returns {Promise<void>} JSON avec la liste des decks (200) ou un message si vide
   *
   * @throws {401} Utilisateur non authentifié - Token JWT manquant ou invalide
   * @throws {500} Erreur serveur - Erreur lors de la récupération
   *
   * @example
   * // GET /decks/mine
   * // Réponse 200: {"decks": [{id: 1, name: "Mon Deck", ...}, ...]}
   */
  async getDecksByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId
      if (!userId) {
        res.status(401).json({ error: 'Utilisateur non authentifié' })
        return
      }
      const decks = await decksService.getDecksByUserId(userId)
      if (decks.length === 0) {
        res
          .status(200)
          .json({ message: 'Aucun deck trouvé pour cet utilisateur' })
      } else {
        res.status(200).json({ decks })
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des decks:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  /**
   * Récupère un deck spécifique par son ID
   *
   * @param {Request} req - Requête Express (params: {id: string}, userId injecté par le middleware)
   * @param {Response} res - Réponse Express
   *
   * @returns {Promise<void>} JSON avec le deck (200) ou une erreur
   *
   * @throws {403} Accès refusé à ce deck - Le deck appartient à un autre utilisateur
   * @throws {404} Deck inexistant - Aucun deck trouvé avec cet ID
   * @throws {500} Erreur serveur - Erreur lors de la récupération
   *
   * @example
   * // GET /decks/1
   * // Réponse 200: {"deck": {id: 1, name: "Mon Deck", deckCard: [...]}}
   */
  async getDeckById(req: Request, res: Response): Promise<void> {
    try {
      const deckId = parseInt(req.params.id, 10)
      const deck = await decksService.getDeckById(deckId, req.userId!)
      if (!deck) {
        res.status(404).json({ error: 'Deck inexistant' })
        return
      } else if (deck.userId !== req.userId) {
        res.status(403).json({ error: 'Accès refusé à ce deck' })
        return
      } else {
        res.status(200).json({ deck })
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du deck:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  /**
   * Met à jour un deck existant (nom et/ou cartes)
   *
   * @param {Request} req - Requête Express (params: {id: string}, body: {name?: string, cards?: number[]}, userId injecté)
   * @param {Response} res - Réponse Express
   *
   * @returns {Promise<void>} JSON avec le deck mis à jour (200) ou une erreur
   *
   * @throws {400} Un deck doit contenir exactement 10 cartes - Nombre de cartes invalide
   * @throws {400} Certaines cartes n'existent pas - IDs de cartes invalides
   * @throws {403} Accès refusé à ce deck - Le deck appartient à un autre utilisateur
   * @throws {404} Deck inexistant - Aucun deck trouvé avec cet ID
   * @throws {500} Erreur serveur - Erreur lors de la mise à jour
   *
   * @example
   * // PATCH /decks/1
   * // Body: {"name": "Nouveau Nom"} ou {"cards": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
   * // Réponse 200: {"message": "Deck mis à jour avec succès", "deck": {...}}
   */
  async patchDeck(req: Request, res: Response): Promise<void> {
    try {
      const deckId = parseInt(req.params.id, 10)
      const { name, cards } = req.body
      const updatedDeck = await decksService.patchDeck(
        deckId,
        req.userId!,
        name,
        cards,
      )
      if (!updatedDeck) {
        res.status(404).json({ error: 'Deck inexistant' })
        return
      } else if (updatedDeck.userId !== req.userId) {
        res.status(403).json({ error: 'Accès refusé à ce deck' })
        return
      } else {
        res.status(200).json({
          message: 'Deck mis à jour avec succès',
          deck: updatedDeck,
        })
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'ERREUR_NB_CARTES') {
        res
          .status(400)
          .json({ error: 'Un deck doit contenir exactement 10 cartes' })
        return
      }
      if (
        error instanceof Error &&
        error.message === 'ERREUR_CARTES_INVALIDES'
      ) {
        res.status(400).json({ error: "Certaines cartes n'existent pas" })
        return
      }
      console.error('Erreur lors de la mise à jour du deck:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  /**
   * Supprime un deck existant
   *
   * @param {Request} req - Requête Express (params: {id: string}, userId injecté par le middleware)
   * @param {Response} res - Réponse Express
   *
   * @returns {Promise<void>} JSON avec un message de confirmation (200) ou une erreur
   *
   * @throws {403} Accès refusé à ce deck - Le deck appartient à un autre utilisateur
   * @throws {404} Deck inexistant - Aucun deck trouvé avec cet ID
   * @throws {500} Erreur serveur - Erreur lors de la suppression
   *
   * @example
   * // DELETE /decks/1
   * // Réponse 200: {"message": "Deck supprimé avec succès"}
   */
  async deleteDeck(req: Request, res: Response): Promise<void> {
    try {
      const deckId = parseInt(req.params.id, 10)
      const deck = await decksService.getDeckById(deckId, req.userId!)
      if (!deck) {
        res.status(404).json({ error: 'Deck inexistant' })
        return
      } else if (deck.userId !== req.userId) {
        res.status(403).json({ error: 'Accès refusé à ce deck' })
        return
      }
      await decksService.deleteDeck(deckId, req.userId!)
      res.status(200).json({ message: 'Deck supprimé avec succès' })
    } catch (error) {
      console.error('Erreur lors de la suppression du deck:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }
}

export const decksController = new DecksController()
