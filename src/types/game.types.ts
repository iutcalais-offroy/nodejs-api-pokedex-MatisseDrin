import { PokemonType } from '../generated/prisma/client'

/**
 * État d'une carte dans le jeu
 */
export interface GameCard {
  id: number
  name: string
  hp: number
  attack: number
  type: PokemonType
  pokedexNumber: number
  imgUrl: string | null
  currentHp: number
}

/**
 * Informations d'un joueur dans la partie
 */
export interface PlayerData {
  userId: number
  username: string
  email: string
  socketId: string
  deckId: number
  hand: GameCard[]
  deck: GameCard[]
  bench: GameCard[]
  active: GameCard | null
  score: number
}

/**
 * État d'une room/partie
 */
export interface GameRoom {
  roomId: string
  status: 'waiting' | 'playing' | 'finished'
  host: {
    userId: number
    username: string
    email: string
    socketId: string
    deckId: number
  }
  guest: {
    userId: number
    username: string
    email: string
    socketId: string
    deckId: number
  } | null
  createdAt: Date
  gameState?: {
    player1: PlayerData
    player2: PlayerData
    currentTurn: number
    turnNumber: number
  }
}

/**
 * Vue publique d'une room
 */
export interface PublicRoom {
  roomId: string
  host: {
    username: string
  }
  createdAt: Date
}

/**
 * État du jeu vu par un joueur spécifique
 */
export interface PlayerGameState {
  roomId: string
  currentTurn: number
  turnNumber: number
  you: {
    userId: number
    username: string
    hand: GameCard[]
    deck: GameCard[]
    bench: GameCard[]
    active: GameCard | null
    score: number
  }
  opponent: {
    userId: number
    username: string
    handCount: number
    deckCount: number
    bench: GameCard[]
    active: GameCard | null
    score: number
  }
}
