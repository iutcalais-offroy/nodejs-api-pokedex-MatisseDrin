import { GameRoom, PublicRoom, GameCard, PlayerData } from '../types/game.types'
import { v4 as uuidv4 } from 'uuid'
import { Card } from '../generated/prisma/client'

/**
 * Gestionnaire des rooms de jeu
 * Stocke les rooms en mémoire
 */
class RoomManager {
  private rooms: Map<string, GameRoom> = new Map()

  /**
   * Crée une nouvelle room
   */
  createRoom(
    userId: number,
    username: string,
    email: string,
    socketId: string,
    deckId: number,
  ): GameRoom {
    const roomId = uuidv4()
    const room: GameRoom = {
      roomId,
      status: 'waiting',
      host: {
        userId,
        username,
        email,
        socketId,
        deckId,
      },
      guest: null,
      createdAt: new Date(),
    }

    this.rooms.set(roomId, room)
    return room
  }

  /**
   * Récupère une room par son ID
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  /**
   * Récupère toutes les rooms disponibles (en attente)
   */
  getAvailableRooms(): PublicRoom[] {
    const availableRooms: PublicRoom[] = []
    this.rooms.forEach((room) => {
      if (room.status === 'waiting' && room.guest === null) {
        availableRooms.push({
          roomId: room.roomId,
          host: {
            username: room.host.username,
          },
          createdAt: room.createdAt,
        })
      }
    })
    return availableRooms
  }

  /**
   * Rejoint une room
   */
  joinRoom(
    roomId: string,
    userId: number,
    username: string,
    email: string,
    socketId: string,
    deckId: number,
  ): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'waiting' || room.guest !== null) {
      return null
    }

    // Empêcher un utilisateur de rejoindre sa propre room
    if (room.host.userId === userId) {
      return null
    }

    room.guest = {
      userId,
      username,
      email,
      socketId,
      deckId,
    }
    room.status = 'playing'

    return room
  }

  /**
   * Initialise l'état du jeu avec les decks des deux joueurs
   */
  initializeGame(room: GameRoom, hostDeck: Card[], guestDeck: Card[]): void {
    // Mélanger les decks
    const shuffledHostDeck = this.shuffleDeck([...hostDeck])
    const shuffledGuestDeck = this.shuffleDeck([...guestDeck])

    // Convertir les cartes en GameCard
    const convertToGameCard = (card: Card): GameCard => ({
      id: card.id,
      name: card.name,
      hp: card.hp,
      attack: card.attack,
      type: card.type,
      pokedexNumber: card.pokedexNumber,
      imgUrl: card.imgUrl,
      currentHp: card.hp,
    })

    // Piocher 5 cartes pour chaque joueur
    const player1Hand = shuffledHostDeck.slice(0, 5).map(convertToGameCard)
    const player1Deck = shuffledHostDeck.slice(5).map(convertToGameCard)

    const player2Hand = shuffledGuestDeck.slice(0, 5).map(convertToGameCard)
    const player2Deck = shuffledGuestDeck.slice(5).map(convertToGameCard)

    // Créer l'état initial du jeu
    const player1: PlayerData = {
      userId: room.host.userId,
      username: room.host.username,
      email: room.host.email,
      socketId: room.host.socketId,
      deckId: room.host.deckId,
      hand: player1Hand,
      deck: player1Deck,
      bench: [],
      active: null,
      score: 0,
    }

    const player2: PlayerData = {
      userId: room.guest!.userId,
      username: room.guest!.username,
      email: room.guest!.email,
      socketId: room.guest!.socketId,
      deckId: room.guest!.deckId,
      hand: player2Hand,
      deck: player2Deck,
      bench: [],
      active: null,
      score: 0,
    }

    room.gameState = {
      player1,
      player2,
      currentTurn: room.host.userId,
      turnNumber: 1,
    }
  }

  /**
   * Mélange un deck de cartes
   */
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Supprime une room
   */
  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId)
  }

  /**
   * Nettoie toutes les rooms
   */
  clearAllRooms(): void {
    this.rooms.clear()
  }

  /**
   * Récupère toutes les rooms
   */
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
  }
}

// Instance singleton
export const roomManager = new RoomManager()
