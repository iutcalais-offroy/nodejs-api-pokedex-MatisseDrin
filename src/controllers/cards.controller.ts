import { Request, Response } from 'express'
import { cardsService } from '../services/cards.service'

/**
 * Contrôleur de gestion des cartes Pokémon
 *
 * Gère les requêtes HTTP liées aux cartes
 */
export class CardsController {
  /**
   * Récupère toutes les cartes disponibles
   *
   * @param {Request} _req - Objet de requête Express (non utilisé)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {Promise<void>} Retourne un JSON avec la liste des cartes (200) ou une erreur (500)
   *
   * @throws {500} Erreur serveur - Erreur lors de la récupération des cartes en base de données
   *
   * @example
   * // GET /cards
   * // Réponse 200: [{id: 1, name: "Bulbasaur", hp: 45, attack: 49, type: "Grass", ...}, ...]
   */
  async getAllCards(_req: Request, res: Response): Promise<void> {
    try {
      const cards = await cardsService.getAllCards()

      res.status(200).json(cards)
    } catch (error) {
      console.error('Erreur lors de la récupération des cartes:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }
}

export const cardsController = new CardsController()
