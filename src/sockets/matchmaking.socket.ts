import { Server, Socket } from 'socket.io'
import { roomManager } from '../services/room.service'
import { prisma } from '../database'
import { PlayerGameState } from '../types/game.types'

/**
 * Configure les événements Socket.io pour le matchmaking
 */
export function setupMatchmakingEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(
      `✅ User connected via Socket.io - userId: ${socket.userId}, email: ${socket.email}`,
    )

    // Send welcome message with user info
    socket.emit('authenticated', {
      userId: socket.userId,
      email: socket.email,
      message: 'Successfully authenticated',
    })

    /**
     * Événement: createRoom
     * Créer une room d'attente avec un deck
     */
    socket.on('createRoom', async (data: { deckId: number }) => {
      try {
        const { deckId } = data

        if (!deckId || typeof deckId !== 'number' || isNaN(deckId)) {
          socket.emit('error', {
            message: 'deckId est requis et doit être un nombre valide',
          })
          return
        }

        // Vérifier que le deck existe et appartient à l'utilisateur
        const deck = await prisma.deck.findFirst({
          where: {
            id: deckId,
            userId: socket.userId,
          },
          include: {
            deckCard: {
              include: {
                card: true,
              },
            },
          },
        })

        if (!deck) {
          socket.emit('error', {
            message: "Le deck n'existe pas ou ne vous appartient pas",
          })
          return
        }

        // Vérifier que le deck a exactement 10 cartes
        if (deck.deckCard.length !== 10) {
          socket.emit('error', {
            message: `Le deck doit contenir exactement 10 cartes (${deck.deckCard.length} trouvées)`,
          })
          return
        }

        // Récupérer le username de l'utilisateur
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
        })

        if (!user) {
          socket.emit('error', { message: 'Utilisateur non trouvé' })
          return
        }

        // Créer la room
        const room = roomManager.createRoom(
          socket.userId!,
          user.username,
          socket.email!,
          socket.id,
          deckId,
        )

        // Rejoindre la room Socket.io
        socket.join(room.roomId)

        // Confirmer la création au créateur
        socket.emit('roomCreated', {
          roomId: room.roomId,
          message: "Room créée avec succès. En attente d'un adversaire...",
        })

        // Broadcast la liste mise à jour à tous les clients
        io.emit('roomsListUpdated', {
          rooms: roomManager.getAvailableRooms(),
        })

        console.log(
          `🎮 Room ${room.roomId} créée par ${user.username} (userId: ${socket.userId})`,
        )
      } catch (error) {
        console.error('Erreur lors de la création de la room:', error)
        socket.emit('error', {
          message: 'Erreur lors de la création de la room',
        })
      }
    })

    /**
     * Événement: getRooms
     * Obtenir la liste des rooms disponibles
     */
    socket.on('getRooms', () => {
      try {
        const rooms = roomManager.getAvailableRooms()
        socket.emit('roomsList', { rooms })
      } catch (error) {
        console.error('Erreur lors de la récupération des rooms:', error)
        socket.emit('error', {
          message: 'Erreur lors de la récupération des rooms',
        })
      }
    })

    /**
     * Événement: joinRoom
     * Rejoindre une room existante et démarrer la partie
     */
    socket.on('joinRoom', async (data: { roomId: string; deckId: number }) => {
      try {
        const { roomId, deckId } = data

        if (!roomId || !deckId || typeof deckId !== 'number' || isNaN(deckId)) {
          socket.emit('error', {
            message: 'roomId et deckId (nombre) sont requis',
          })
          return
        }

        // Vérifier que la room existe et est disponible
        const room = roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('error', { message: "La room n'existe pas" })
          return
        }

        if (room.status !== 'waiting' || room.guest !== null) {
          socket.emit('error', {
            message: 'La room est déjà complète',
          })
          return
        }

        // Empêcher un utilisateur de rejoindre sa propre room
        if (room.host.userId === socket.userId) {
          socket.emit('error', {
            message: 'Vous ne pouvez pas rejoindre votre propre room',
          })
          return
        }

        // Vérifier que le deck existe et appartient à l'utilisateur
        const deck = await prisma.deck.findFirst({
          where: {
            id: deckId,
            userId: socket.userId,
          },
          include: {
            deckCard: {
              include: {
                card: true,
              },
            },
          },
        })

        if (!deck) {
          socket.emit('error', {
            message: "Le deck n'existe pas ou ne vous appartient pas",
          })
          return
        }

        // Vérifier que le deck a exactement 10 cartes
        if (deck.deckCard.length !== 10) {
          socket.emit('error', {
            message: `Le deck doit contenir exactement 10 cartes (${deck.deckCard.length} trouvées)`,
          })
          return
        }

        // Récupérer le username de l'utilisateur
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
        })

        if (!user) {
          socket.emit('error', { message: 'Utilisateur non trouvé' })
          return
        }

        // Rejoindre la room
        const updatedRoom = roomManager.joinRoom(
          roomId,
          socket.userId!,
          user.username,
          socket.email!,
          socket.id,
          deckId,
        )

        if (!updatedRoom) {
          socket.emit('error', {
            message: 'Impossible de rejoindre la room',
          })
          return
        }

        // Rejoindre la room Socket.io
        socket.join(roomId)

        // Récupérer les decks complets des deux joueurs
        const hostDeck = await prisma.deck.findFirst({
          where: { id: updatedRoom.host.deckId },
          include: {
            deckCard: {
              include: {
                card: true,
              },
            },
          },
        })

        const guestDeck = deck

        if (!hostDeck) {
          socket.emit('error', { message: 'Deck du host non trouvé' })
          return
        }

        // Initialiser l'état du jeu
        roomManager.initializeGame(
          updatedRoom,
          hostDeck.deckCard.map((dc) => dc.card),
          guestDeck.deckCard.map((dc) => dc.card),
        )

        // Préparer l'état du jeu pour chaque joueur
        const gameState = updatedRoom.gameState!

        // État pour le host (player1)
        const hostGameState: PlayerGameState = {
          roomId: updatedRoom.roomId,
          yourTurn: gameState.currentTurn === gameState.player1.userId,
          turnNumber: gameState.turnNumber,
          you: {
            hand: gameState.player1.hand,
            deck: gameState.player1.deck.length,
            bench: gameState.player1.bench,
            active: gameState.player1.active,
          },
          opponent: {
            hand: gameState.player2.hand.length, // Nombre de cartes seulement
            deck: gameState.player2.deck.length,
            bench: gameState.player2.bench,
            active: gameState.player2.active,
          },
        }

        // État pour le guest (player2)
        const guestGameState: PlayerGameState = {
          roomId: updatedRoom.roomId,
          yourTurn: gameState.currentTurn === gameState.player2.userId,
          turnNumber: gameState.turnNumber,
          you: {
            hand: gameState.player2.hand,
            deck: gameState.player2.deck.length,
            bench: gameState.player2.bench,
            active: gameState.player2.active,
          },
          opponent: {
            hand: gameState.player1.hand.length, // Nombre de cartes seulement
            deck: gameState.player1.deck.length,
            bench: gameState.player1.bench,
            active: gameState.player1.active,
          },
        }

        // Envoyer l'état initial à chaque joueur
        io.to(updatedRoom.host.socketId).emit('gameStarted', {
          message: 'La partie commence !',
          opponent: {
            username: updatedRoom.guest!.username,
          },
          gameState: hostGameState,
        })

        io.to(updatedRoom.guest!.socketId).emit('gameStarted', {
          message: 'La partie commence !',
          opponent: {
            username: updatedRoom.host.username,
          },
          gameState: guestGameState,
        })

        // Broadcast la liste mise à jour (la room disparaît)
        io.emit('roomsListUpdated', {
          rooms: roomManager.getAvailableRooms(),
        })

        console.log(
          `🎮 Room ${roomId} - Partie démarrée entre ${updatedRoom.host.username} et ${updatedRoom.guest!.username}`,
        )
      } catch (error) {
        console.error('Erreur lors de la jonction de la room:', error)
        socket.emit('error', {
          message: 'Erreur lors de la jonction de la room',
        })
      }
    })

    /**
     * Gestion de la déconnexion
     */
    socket.on('disconnect', () => {
      console.log(
        `❌ User disconnected - userId: ${socket.userId}, email: ${socket.email}`,
      )

      // TODO: Gérer la déconnexion en cours de partie
      // - Trouver si l'utilisateur était dans une room
      // - Notifier l'adversaire
      // - Nettoyer la room si nécessaire
    })
  })
}
