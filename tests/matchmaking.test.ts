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
import type { Deck, DeckCard, Card } from '../src/generated/prisma/client'

type DeckWithCards = Deck & {
  deckCard: (DeckCard & {
    card: Card
  })[]
}

describe('Matchmaking System', () => {
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
    type: 'Fire',
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

      token1 = jwt.sign(
        { userId: mockUser1.id, email: mockUser1.email },
        env.JWT_SECRET,
        { expiresIn: '1h' },
      )

      token2 = jwt.sign(
        { userId: mockUser2.id, email: mockUser2.email },
        env.JWT_SECRET,
        { expiresIn: '1h' },
      )

      resolve()
    })
  })

  afterEach(() => {
    return new Promise<void>((resolve) => {
      if (clientSocket1?.connected) {
        clientSocket1.disconnect()
      }
      if (clientSocket2?.connected) {
        clientSocket2.disconnect()
      }

      io.close(() => {
        httpServer.close(() => {
          resolve()
        })
      })
    })
  })

  describe('Authentification et connexion', () => {
    it('devrait refuser une connexion sans token', () => {
      return new Promise<void>((resolve) => {
        const port = (httpServer.address() as AddressInfo).port
        const client = ioClient(`http://localhost:${port}`)

        client.on('connect_error', (error) => {
          expect(error.message).toContain('Token')
          client.disconnect()
          resolve()
        })
      })
    })

    it('devrait accepter une connexion avec un token valide', () => {
      return new Promise<void>((resolve) => {
        const port = (httpServer.address() as AddressInfo).port
        clientSocket1 = ioClient(`http://localhost:${port}`, {
          auth: { token: token1 },
        })

        clientSocket1.on('authenticated', (data) => {
          expect(data.userId).toBe(mockUser1.id)
          expect(data.email).toBe(mockUser1.email)
          resolve()
        })
      })
    })
  })

  describe('Création de room', () => {
    beforeEach(() => {
      return new Promise<void>((resolve) => {
        const port = (httpServer.address() as AddressInfo).port
        clientSocket1 = ioClient(`http://localhost:${port}`, {
          auth: { token: token1 },
        })
        clientSocket1.on('authenticated', () => resolve())
      })
    })

    it('devrait créer une room avec un deck valide', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(mockDeck1 as DeckWithCards)
        prismaMock.user.findUnique.mockResolvedValue(mockUser1)

        clientSocket1.emit('createRoom', { deckId: 1 })

        clientSocket1.on('roomCreated', (data) => {
          expect(data).toHaveProperty('roomId')
          expect(data).toHaveProperty('message')
          expect(data.message).toContain('Room créée')
          resolve()
        })
      })
    })

    it('devrait refuser de créer une room sans deckId', () => {
      return new Promise<void>((resolve) => {
        clientSocket1.emit('createRoom', {})

        clientSocket1.on('error', (data) => {
          expect(data.message).toContain('deckId est requis')
          resolve()
        })
      })
    })

    it("devrait refuser un deck qui n'appartient pas à l'utilisateur", () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(null)

        clientSocket1.emit('createRoom', { deckId: 999 })

        clientSocket1.on('error', (data) => {
          expect(data.message).toContain(
            "n'existe pas ou ne vous appartient pas",
          )
          resolve()
        })
      })
    })

    it('devrait refuser un deck avec moins de 10 cartes', () => {
      return new Promise<void>((resolve) => {
        const invalidDeck = {
          ...mockDeck1,
          deckCard: mockDeck1.deckCard.slice(0, 5),
        }

        prismaMock.deck.findFirst.mockResolvedValue(
          invalidDeck as DeckWithCards,
        )

        clientSocket1.emit('createRoom', { deckId: 1 })

        clientSocket1.on('error', (data) => {
          expect(data.message).toContain('10 cartes')
          expect(data.message).toContain('5 trouvées')
          resolve()
        })
      })
    })
  })

  describe('Liste des rooms', () => {
    beforeEach(() => {
      return new Promise<void>((resolve) => {
        const port = (httpServer.address() as AddressInfo).port
        clientSocket1 = ioClient(`http://localhost:${port}`, {
          auth: { token: token1 },
        })
        clientSocket1.on('authenticated', () => resolve())
      })
    })

    it('devrait retourner une liste vide si aucune room', () => {
      return new Promise<void>((resolve) => {
        clientSocket1.emit('getRooms')

        clientSocket1.on('roomsList', (data) => {
          expect(data.rooms).toEqual([])
          resolve()
        })
      })
    })

    it('devrait retourner les rooms disponibles', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(mockDeck1 as DeckWithCards)
        prismaMock.user.findUnique.mockResolvedValue(mockUser1)

        // Créer une room d'abord
        clientSocket1.emit('createRoom', { deckId: 1 })

        clientSocket1.on('roomCreated', () => {
          // Demander la liste des rooms
          clientSocket1.emit('getRooms')
        })

        clientSocket1.on('roomsList', (data) => {
          expect(data.rooms).toHaveLength(1)
          expect(data.rooms[0]).toHaveProperty('roomId')
          expect(data.rooms[0]).toHaveProperty('host')
          expect(data.rooms[0].host.username).toBe('player1')
          resolve()
        })
      })
    })
  })

  describe('Rejoindre une room', () => {
    let roomId: string

    beforeEach(() => {
      return new Promise<void>((resolve) => {
        const port = (httpServer.address() as AddressInfo).port

        // Créer deux clients
        clientSocket1 = ioClient(`http://localhost:${port}`, {
          auth: { token: token1 },
        })
        clientSocket2 = ioClient(`http://localhost:${port}`, {
          auth: { token: token2 },
        })

        let authenticatedCount = 0
        const checkAuthenticated = () => {
          authenticatedCount++
          if (authenticatedCount === 2) {
            // Créer une room avec le premier client
            prismaMock.deck.findFirst.mockResolvedValue(
              mockDeck1 as DeckWithCards,
            )
            prismaMock.user.findUnique.mockResolvedValue(mockUser1)

            clientSocket1.emit('createRoom', { deckId: 1 })
          }
        }

        clientSocket1.on('authenticated', checkAuthenticated)
        clientSocket2.on('authenticated', checkAuthenticated)

        clientSocket1.on('roomCreated', (data) => {
          roomId = data.roomId
          resolve()
        })
      })
    })

    it('devrait permettre de rejoindre une room existante', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(mockDeck2 as DeckWithCards)
        prismaMock.user.findUnique.mockResolvedValue(mockUser2)

        clientSocket2.emit('joinRoom', { roomId, deckId: 2 })

        clientSocket2.on('gameStarted', (data) => {
          expect(data).toHaveProperty('gameState')
          expect(data).toHaveProperty('message')
          expect(data).toHaveProperty('opponent')
          expect(data.gameState).toHaveProperty('roomId')
          expect(data.gameState).toHaveProperty('yourTurn')
          expect(data.gameState).toHaveProperty('you')
          expect(data.gameState).toHaveProperty('opponent')
          expect(data.gameState.you.hand).toHaveLength(5)
          resolve()
        })
      })
    })

    it('devrait démarrer la partie pour les deux joueurs', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(mockDeck2 as DeckWithCards)
        prismaMock.user.findUnique.mockResolvedValue(mockUser2)

        let gameStartedCount = 0

        const checkGameStarted = () => {
          gameStartedCount++
          if (gameStartedCount === 2) {
            resolve()
          }
        }

        clientSocket1.on('gameStarted', checkGameStarted)
        clientSocket2.on('gameStarted', checkGameStarted)

        clientSocket2.emit('joinRoom', { roomId, deckId: 2 })
      })
    })

    it('devrait refuser de rejoindre une room inexistante', () => {
      return new Promise<void>((resolve) => {
        clientSocket2.emit('joinRoom', {
          roomId: 'fake-room-id',
          deckId: 2,
        })

        clientSocket2.on('error', (data) => {
          expect(data.message).toContain("n'existe pas")
          resolve()
        })
      })
    })

    it('devrait refuser de rejoindre sa propre room', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(mockDeck1 as DeckWithCards)
        prismaMock.user.findUnique.mockResolvedValue(mockUser1)

        clientSocket1.emit('joinRoom', { roomId, deckId: 1 })

        clientSocket1.on('error', (data) => {
          expect(data.message).toContain(
            'Vous ne pouvez pas rejoindre votre propre room',
          )
          resolve()
        })
      })
    })

    it('devrait refuser de rejoindre avec un deck invalide', () => {
      return new Promise<void>((resolve) => {
        prismaMock.deck.findFirst.mockResolvedValue(null)

        clientSocket2.emit('joinRoom', { roomId, deckId: 999 })

        clientSocket2.on('error', (data) => {
          expect(data.message).toContain(
            "n'existe pas ou ne vous appartient pas",
          )
          resolve()
        })
      })
    })
  })

  describe('Broadcast des événements', () => {
    it('devrait notifier tous les clients quand une room est créée', () => {
      return new Promise<void>((resolve) => {
        const port = (httpServer.address() as AddressInfo).port

        clientSocket1 = ioClient(`http://localhost:${port}`, {
          auth: { token: token1 },
        })
        clientSocket2 = ioClient(`http://localhost:${port}`, {
          auth: { token: token2 },
        })

        let authenticatedCount = 0
        const checkAuthenticated = () => {
          authenticatedCount++
          if (authenticatedCount === 2) {
            prismaMock.deck.findFirst.mockResolvedValue(
              mockDeck1 as DeckWithCards,
            )
            prismaMock.user.findUnique.mockResolvedValue(mockUser1)

            // Le client 2 écoute les mises à jour
            clientSocket2.on('roomsListUpdated', (data) => {
              expect(data.rooms).toHaveLength(1)
              resolve()
            })

            // Le client 1 crée une room
            clientSocket1.emit('createRoom', { deckId: 1 })
          }
        }

        clientSocket1.on('authenticated', checkAuthenticated)
        clientSocket2.on('authenticated', checkAuthenticated)
      })
    })
  })
})
