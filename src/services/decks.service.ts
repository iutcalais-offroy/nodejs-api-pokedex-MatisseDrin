import { prisma } from '../database'

/**
 * Service de gestion des decks de cartes
 *
 * Gère toutes les opérations CRUD sur les decks via Prisma ORM.
 * Chaque deck appartient à un utilisateur et contient exactement 10 cartes.
 */
export class DecksService {
  /**
   * Crée un nouveau deck pour un utilisateur
   *
   * @param {number} userId - ID de l'utilisateur propriétaire du deck
   * @param {string} name - Nom du deck
   * @param {number[]} cardId - Tableau contenant les IDs des 10 cartes du deck
   *
   * @returns {Promise<Deck & {deckCard: DeckCard[]}>} Le deck créé avec ses cartes
   *
   * @throws {Error} ERREUR_NB_CARTES - Le deck ne contient pas exactement 10 cartes
   * @throws {Error} ERREUR_CARTES_INVALIDES - Au moins une carte n'existe pas en base de données
   * @throws {Error} Erreur de base de données lors de la création
   *
   * @example
   * const deck = await decksService.createDeck(1, "Mon Deck Feu", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
   */
  async createDeck(userId: number, name: string, cardId: number[]) {
    if (cardId.length !== 10) {
      throw new Error('ERREUR_NB_CARTES')
    }

    const existingCards = await prisma.card.findMany({
      where: {
        id: { in: cardId },
      },
    })

    const existingIds = new Set(existingCards.map((card) => card.id))
    const allIdsExist = cardId.every((id) => existingIds.has(id))

    if (!allIdsExist) {
      throw new Error('ERREUR_CARTES_INVALIDES')
    }

    const newDeck = await prisma.deck.create({
      data: {
        name,
        userId,
        deckCard: {
          create: cardId.map((cardId) => ({ cardId })),
        },
      },
      include: {
        deckCard: {
          include: { card: true },
        },
      },
    })

    return newDeck
  }

  /**
   * Récupère tous les decks d'un utilisateur
   *
   * @param {number} userId - ID de l'utilisateur
   *
   * @returns {Promise<Deck[]>} Liste des decks avec leurs cartes associées
   *
   * @throws {Error} Erreur de base de données lors de la récupération
   *
   * @example
   * const decks = await decksService.getDecksByUserId(1)
   */
  async getDecksByUserId(userId: number) {
    const decks = await prisma.deck.findMany({
      where: { userId },
      include: {
        deckCard: {
          include: { card: true },
        },
      },
    })
    return decks
  }

  /**
   * Récupère un deck spécifique par son ID
   *
   * @param {number} deckId - ID du deck à récupérer
   * @param {number} userId - ID de l'utilisateur (pour vérifier l'appartenance)
   *
   * @returns {Promise<Deck | null>} Le deck avec ses cartes, ou null si non trouvé
   *
   * @throws {Error} Erreur de base de données lors de la récupération
   *
   * @example
   * const deck = await decksService.getDeckById(1, 1)
   */
  async getDeckById(deckId: number, userId: number) {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId, userId },
      include: {
        deckCard: {
          include: { card: true },
        },
      },
    })
    return deck
  }

  /**
   * Met à jour un deck existant (nom et/ou cartes)
   *
   * @param {number} deckId - ID du deck à mettre à jour
   * @param {number} _userId - ID de l'utilisateur (non utilisé mais présent pour cohérence)
   * @param {string} [name] - Nouveau nom du deck (optionnel)
   * @param {number[]} [cardId] - Nouveaux IDs des cartes (optionnel, doit contenir 10 cartes)
   *
   * @returns {Promise<Deck & {deckCard: DeckCard[]}>} Le deck mis à jour avec ses cartes
   *
   * @throws {Error} ERREUR_NB_CARTES - Le nouveau tableau de cartes ne contient pas exactement 10 cartes
   * @throws {Error} ERREUR_CARTES_INVALIDES - Au moins une carte n'existe pas en base de données
   * @throws {Error} Erreur de base de données lors de la mise à jour
   *
   * @example
   * // Mettre à jour uniquement le nom
   * const deck = await decksService.patchDeck(1, 1, "Nouveau nom")
   *
   * // Mettre à jour le nom et les cartes
   * const deck = await decksService.patchDeck(1, 1, "Nouveau nom", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
   */
  async patchDeck(
    deckId: number,
    _userId: number,
    name?: string,
    cardId?: number[],
  ) {
    const updateData: {
      name?: string
      deckCard?: { create: { cardId: number }[] }
    } = {}
    if (name) {
      updateData.name = name
    }
    if (cardId) {
      if (cardId.length !== 10) {
        throw new Error('ERREUR_NB_CARTES')
      }
      const existingCards = await prisma.card.findMany({
        where: {
          id: { in: cardId },
        },
      })
      const existingIds = new Set(existingCards.map((card) => card.id))
      const allIdsExist = cardId.every((id) => existingIds.has(id))
      if (!allIdsExist) {
        throw new Error('ERREUR_CARTES_INVALIDES')
      }
      await prisma.deckCard.deleteMany({ where: { deckId } })
      updateData.deckCard = {
        create: cardId.map((cardId) => ({ cardId })),
      }
    }
    const updatedDeck = await prisma.deck.update({
      where: { id: deckId },
      data: updateData,
      include: {
        deckCard: {
          include: { card: true },
        },
      },
    })
    return updatedDeck
  }

  /**
   * Supprime un deck et toutes ses associations de cartes
   *
   * @param {number} deckId - ID du deck à supprimer
   * @param {number} userId - ID de l'utilisateur (pour vérifier l'appartenance)
   *
   * @returns {Promise<Deck | null>} Le deck supprimé, ou null s'il n'existe pas
   *
   * @throws {Error} Erreur de base de données lors de la suppression
   *
   * @example
   * const deletedDeck = await decksService.deleteDeck(1, 1)
   */
  async deleteDeck(deckId: number, userId: number) {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId, userId },
    })
    if (!deck) {
      return null
    }
    await prisma.deckCard.deleteMany({ where: { deckId } })
    await prisma.deck.delete({ where: { id: deckId } })
    return deck
  }
}

export const decksService = new DecksService()
