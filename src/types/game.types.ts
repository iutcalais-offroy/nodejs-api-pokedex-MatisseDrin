/**
 * État d'une carte dans le jeu
 */
export interface GameCard {
  id: number
  name: string
  hp: number
  attack: number
  type: string
  pokedexNumber: number
  imgUrl: string | null
  currentHp?: number // HP actuel (peut être différent du HP max)
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
  hand: GameCard[] // Cartes en main
  deck: GameCard[] // Cartes restantes dans le deck
  bench: GameCard[] // Pokémon sur le banc
  active: GameCard | null // Pokémon actif
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
    currentTurn: number // userId du joueur dont c'est le tour
    turnNumber: number
  }
}

/**
 * Vue publique d'une room (pour la liste)
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
  yourTurn: boolean
  turnNumber: number
  you: {
    hand: GameCard[]
    deck: number // Nombre de cartes restantes (pas le contenu)
    bench: GameCard[]
    active: GameCard | null
  }
  opponent: {
    hand: number // Nombre de cartes (pas le contenu)
    deck: number
    bench: GameCard[]
    active: GameCard | null
  }
}
