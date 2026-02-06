import { prisma } from '../database'

/**
 * Service de gestion des cartes Pokémon
 *
 * Gère toutes les opérations liées aux cartes via Prisma ORM
 */
export class CardsService {
  /**
   * Récupère toutes les cartes triées par numéro de Pokédex
   *
   * @returns {Promise<Card[]>} Liste de toutes les cartes triées par pokedexNumber (ordre croissant)
   *
   * @throws {Error} Erreur de base de données si la requête Prisma échoue
   *
   * @example
   * const cards = await cardsService.getAllCards()
   * // Retourne: [{id: 1, name: "Bulbasaur", pokedexNumber: 1, ...}, ...]
   */
  async getAllCards() {
    const cards = await prisma.card.findMany({
      orderBy: {
        pokedexNumber: 'asc',
      },
    })

    return cards
  }
}

export const cardsService = new CardsService()
