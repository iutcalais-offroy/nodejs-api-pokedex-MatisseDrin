import { Server, Socket } from 'socket.io'
import { roomManager } from '../services/room.service'
import { PlayerGameState } from '../types/game.types'
import { calculateDamage } from '../utils/rules.util'

/**
 * Configure les événements de jeu
 */
export function setupGameEvents(io: Server, socket: Socket): void {
  /**
   * Helper: Créer les états de jeu asymétriques pour les deux joueurs
   */
  const createPlayerGameStates = (
    roomId: string,
  ): {
    player1State: PlayerGameState
    player2State: PlayerGameState
  } | null => {
    const room = roomManager.getRoom(roomId)
    if (!room || !room.gameState) {
      return null
    }

    const { player1, player2, currentTurn, turnNumber } = room.gameState

    // État pour le joueur 1 (voit tout de lui, limité de l'adversaire)
    const player1State: PlayerGameState = {
      roomId: room.roomId,
      you: {
        userId: player1.userId,
        username: player1.username,
        hand: player1.hand,
        deck: player1.deck,
        bench: player1.bench,
        active: player1.active,
        score: player1.score,
      },
      opponent: {
        userId: player2.userId,
        username: player2.username,
        handCount: player2.hand.length,
        deckCount: player2.deck.length,
        bench: player2.bench,
        active: player2.active,
        score: player2.score,
      },
      currentTurn,
      turnNumber,
    }

    // État pour le joueur 2 (voit tout de lui, limité de l'adversaire)
    const player2State: PlayerGameState = {
      roomId: room.roomId,
      you: {
        userId: player2.userId,
        username: player2.username,
        hand: player2.hand,
        deck: player2.deck,
        bench: player2.bench,
        active: player2.active,
        score: player2.score,
      },
      opponent: {
        userId: player1.userId,
        username: player1.username,
        handCount: player1.hand.length,
        deckCount: player1.deck.length,
        bench: player1.bench,
        active: player1.active,
        score: player1.score,
      },
      currentTurn,
      turnNumber,
    }

    return { player1State, player2State }
  }

  /**
   * Helper: Émettre l'état de jeu aux deux joueurs
   */
  const emitGameState = (roomId: string): boolean => {
    const states = createPlayerGameStates(roomId)
    if (!states) return false

    const room = roomManager.getRoom(roomId)
    if (!room || !room.gameState) return false

    io.to(room.gameState.player1.socketId).emit(
      'gameStateUpdated',
      states.player1State,
    )
    io.to(room.gameState.player2.socketId).emit(
      'gameStateUpdated',
      states.player2State,
    )

    return true
  }

  /**
   * Événement: Piocher des cartes
   */
  socket.on('drawCards', ({ roomId }: { roomId: string }) => {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const userId = socket.userId!
      const { player1, player2, currentTurn } = room.gameState

      // Vérifier que c'est le tour du joueur
      if (currentTurn !== userId) {
        socket.emit('error', { message: 'Not your turn' })
        return
      }

      // Déterminer le joueur actif
      const currentPlayer = player1.userId === userId ? player1 : player2

      // Piocher jusqu'à avoir 5 cartes en main
      while (currentPlayer.hand.length < 5 && currentPlayer.deck.length > 0) {
        const drawnCard = currentPlayer.deck.shift()!
        currentPlayer.hand.push(drawnCard)
      }

      // Émettre l'état mis à jour
      emitGameState(roomId)
    } catch (error) {
      console.error('Error in drawCards:', error)
      socket.emit('error', { message: 'Failed to draw cards' })
    }
  })

  /**
   * Événement: Jouer une carte
   */
  socket.on(
    'playCard',
    ({ roomId, cardIndex }: { roomId: string; cardIndex: number }) => {
      try {
        const room = roomManager.getRoom(roomId)
        if (!room || !room.gameState) {
          socket.emit('error', { message: 'Room not found' })
          return
        }

        const userId = socket.userId!
        const { player1, player2, currentTurn } = room.gameState

        // Vérifier que c'est le tour du joueur
        if (currentTurn !== userId) {
          socket.emit('error', { message: 'Not your turn' })
          return
        }

        // Déterminer le joueur actif
        const currentPlayer = player1.userId === userId ? player1 : player2

        // Vérifier l'index de la carte
        if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) {
          socket.emit('error', { message: 'Invalid card index' })
          return
        }

        // Vérifier qu'il n'y a pas déjà une carte active
        if (currentPlayer.active !== null) {
          socket.emit('error', { message: 'Active slot already occupied' })
          return
        }

        // Jouer la carte
        const [playedCard] = currentPlayer.hand.splice(cardIndex, 1)
        currentPlayer.active = playedCard

        // Émettre l'état mis à jour
        emitGameState(roomId)
      } catch (error) {
        console.error('Error in playCard:', error)
        socket.emit('error', { message: 'Failed to play card' })
      }
    },
  )

  /**
   * Événement: Attaquer
   */
  socket.on('attack', ({ roomId }: { roomId: string }) => {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const userId = socket.userId!
      const { player1, player2, currentTurn } = room.gameState

      // Vérifier que c'est le tour du joueur
      if (currentTurn !== userId) {
        socket.emit('error', { message: 'Not your turn' })
        return
      }

      // Déterminer l'attaquant et le défenseur
      const attacker = player1.userId === userId ? player1 : player2
      const defender = player1.userId === userId ? player2 : player1

      // Vérifier que les deux joueurs ont une carte active
      if (!attacker.active) {
        socket.emit('error', { message: 'No active Pokemon' })
        return
      }

      if (!defender.active) {
        socket.emit('error', { message: 'Opponent has no active Pokemon' })
        return
      }

      // Calculer les dégâts
      const damage = calculateDamage(
        attacker.active.attack,
        attacker.active.type,
        defender.active.type,
      )

      // Appliquer les dégâts
      defender.active.currentHp -= damage

      // Vérifier si le Pokémon défenseur est KO
      if (defender.active.currentHp <= 0) {
        defender.active.currentHp = 0
        // Déplacer la carte KO sur le banc
        defender.bench.push(defender.active)
        defender.active = null
        // Incrémenter le score de l'attaquant
        attacker.score += 1

        // Vérifier la victoire
        if (attacker.score >= 3) {
          io.to(room.gameState.player1.socketId).emit('gameEnded', {
            winner: attacker.userId,
            reason: 'Score limit reached',
          })
          io.to(room.gameState.player2.socketId).emit('gameEnded', {
            winner: attacker.userId,
            reason: 'Score limit reached',
          })
          // Supprimer la room
          roomManager.deleteRoom(roomId)
          return
        }
      }

      // Changer de tour
      room.gameState.currentTurn = defender.userId
      room.gameState.turnNumber += 1

      // Émettre l'état mis à jour
      emitGameState(roomId)
    } catch (error) {
      console.error('Error in attack:', error)
      socket.emit('error', { message: 'Failed to attack' })
    }
  })

  /**
   * Événement: Terminer le tour
   */
  socket.on('endTurn', ({ roomId }: { roomId: string }) => {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const userId = socket.userId!
      const { player1, player2, currentTurn } = room.gameState

      // Vérifier que c'est le tour du joueur
      if (currentTurn !== userId) {
        socket.emit('error', { message: 'Not your turn' })
        return
      }

      // Changer de tour
      const nextPlayerId =
        player1.userId === userId ? player2.userId : player1.userId
      room.gameState.currentTurn = nextPlayerId
      room.gameState.turnNumber += 1

      // Émettre l'état mis à jour
      emitGameState(roomId)
    } catch (error) {
      console.error('Error in endTurn:', error)
      socket.emit('error', { message: 'Failed to end turn' })
    }
  })
}
