import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { Server as HttpServer } from 'http'
import { AddressInfo } from 'net'
import express from 'express'
import { Server as SocketIOServer } from 'socket.io'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { prismaMock } from './vitest.setup'
import { setupMatchmakingEvents } from '../src/sockets/matchmaking.socket'
import { authenticateSocket } from '../src/middlewares/auth.middleware'
import { roomManager } from '../src/services/room.service'
import jwt from 'jsonwebtoken'
import { env } from '../src/env'
import type {
  Deck,
  DeckCard,
  Card,
  PokemonType,
} from '../src/generated/prisma/client'

type DeckWithCards = Deck & {
  deckCard: (DeckCard & {
    card: Card
  })[]
}

describe('Game System', () => {
  let httpServer: HttpServer
  let io: SocketIOServer
  let clientSocket1: ClientSocket
  let clientSocket2: ClientSocket
  let token1: string
  let token2: string

  const mockUser1 = {
    id: 1,
    username: 'player1',
    email: 'player1@test.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUser2 = {
    id: 2,
    username: 'player2',
    email: 'player2@test.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockCards = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Card ${i + 1}`,
    hp: 100,
    attack: 50,
    type: 'Fire' as PokemonType,
    pokedexNumber: i + 1,
    imgUrl: `https://example.com/card${i + 1}.png`,
  }))

  const mockDeck1 = {
    id: 1,
    name: 'Deck 1',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deckCard: mockCards.map((card, i) => ({
      id: i + 1,
      deckId: 1,
      cardId: card.id,
      card: card,
    })),
  }

  const mockDeck2 = {
    id: 2,
    name: 'Deck 2',
    userId: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    deckCard: mockCards.map((card, i) => ({
      id: i + 11,
      deckId: 2,
      cardId: card.id,
      card: card,
    })),
  }

  beforeEach(() => {
    return new Promise<void>((resolve) => {
      vi.clearAllMocks()

      roomManager.clearAllRooms()

      const app = express()
      httpServer = app.listen(0)

      io = new SocketIOServer(httpServer, {
        cors: {
          origin: '*',
        },
      })

      io.use(authenticateSocket)
      setupMatchmakingEvents(io)

      httpServer.on('listening', () => {
        const port = (httpServer.address() as AddressInfo).port

        token1 = jwt.sign(
          { userId: mockUser1.id, email: mockUser1.email },
          env.JWT_SECRET,
        )
        token2 = jwt.sign(
          { userId: mockUser2.id, email: mockUser2.email },
          env.JWT_SECRET,
        )

        clientSocket1 = ioClient(`http://localhost:${port}`, {
          auth: { token: token1 },
        })

        clientSocket2 = ioClient(`http://localhost:${port}`, {
          auth: { token: token2 },
        })

        let connectedCount = 0
        const checkConnected = () => {
          connectedCount++
          if (connectedCount === 2) {
            resolve()
          }
        }

        clientSocket1.on('connect', checkConnected)
        clientSocket2.on('connect', checkConnected)
      })
    })
  })

  afterEach(() => {
    return new Promise<void>((resolve) => {
      clientSocket1?.disconnect()
      clientSocket2?.disconnect()
      io?.close()
      httpServer?.close(() => {
        resolve()
      })
    })
  })

  describe('drawCards Event', () => {
    it('should draw cards until hand has 5 cards', () => {
      return new Promise<void>((resolve) => {
        // Créer une room et commencer une partie
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          // Vider la main du joueur 1 pour tester la pioche
          const room = roomManager.getRoom(roomId)
          if (room && room.gameState) {
            room.gameState.player1.hand = []
            room.gameState.player1.deck = mockCards.map((c) => ({
              ...c,
              currentHp: c.hp,
            }))
          }

          clientSocket1.emit('drawCards', { roomId })
        })

        clientSocket1.on('gameStateUpdated', (state) => {
          if (state.you.hand.length === 5) {
            expect(state.you.hand).toHaveLength(5)
            resolve()
          }
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })

    it('should not draw cards if not player turn', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          // Player 2 essaie de piocher alors que c'est le tour de player 1
          clientSocket2.emit('drawCards', { roomId })
        })

        clientSocket2.on('error', (error) => {
          expect(error.message).toBe('Not your turn')
          resolve()
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })
  })

  describe('playCard Event', () => {
    it('should play a card from hand to active slot', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          clientSocket1.emit('playCard', { roomId, cardIndex: 0 })
        })

        clientSocket1.on('gameStateUpdated', (state) => {
          if (state.you.active !== null) {
            expect(state.you.active).toBeDefined()
            expect(state.you.hand).toHaveLength(4)
            resolve()
          }
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })

    it('should not play card if active slot is occupied', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          clientSocket1.emit('playCard', { roomId, cardIndex: 0 })

          setTimeout(() => {
            clientSocket1.emit('playCard', { roomId, cardIndex: 0 })
          }, 100)
        })

        let playCardCount = 0
        clientSocket1.on('error', (error) => {
          playCardCount++
          if (playCardCount === 1) {
            expect(error.message).toBe('Active slot already occupied')
            resolve()
          }
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })
  })

  describe('attack Event', () => {
    it('should calculate damage and reduce HP', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          // Player 1 joue une carte
          clientSocket1.emit('playCard', { roomId, cardIndex: 0 })

          setTimeout(() => {
            // Player 2 joue une carte (doit attendre son tour)
            // On force le changement de tour pour le test
            const room = roomManager.getRoom(roomId)
            if (room && room.gameState) {
              room.gameState.currentTurn = 2
            }
            clientSocket2.emit('playCard', { roomId, cardIndex: 0 })

            setTimeout(() => {
              // Player 2 attaque
              clientSocket2.emit('attack', { roomId })
            }, 100)
          }, 100)
        })

        clientSocket1.on('gameStateUpdated', (state) => {
          if (state.you.active && state.you.active.currentHp < 100) {
            expect(state.you.active.currentHp).toBeLessThan(100)
            resolve()
          }
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })

    it('should not attack if no active Pokemon', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          clientSocket1.emit('attack', { roomId })
        })

        clientSocket1.on('error', (error) => {
          expect(error.message).toBe('No active Pokemon')
          resolve()
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })
  })

  describe('endTurn Event', () => {
    it('should switch turn to opponent', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck2,
            deckCard: mockDeck2.deckCard,
          } as DeckWithCards)
          .mockResolvedValueOnce({
            ...mockDeck1,
            deckCard: mockDeck1.deckCard,
          } as DeckWithCards)
        prismaMock.user.findUnique
          .mockResolvedValueOnce(mockUser1)
          .mockResolvedValueOnce(mockUser2)

        let roomId: string

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
        })

        clientSocket2.on('gameStarted', () => {
          clientSocket1.emit('endTurn', { roomId })
        })

        clientSocket2.on('gameStateUpdated', (state) => {
          if (state.currentTurn === 2) {
            expect(state.currentTurn).toBe(2)
            resolve()
          }
        })

        clientSocket1.emit('createRoom', { deckId: 1 })
      })
    })
  })
})
