import {Request, Response} from 'express'
import {decksService} from '../services/decks.service'

export class DecksController {
    async createDeck(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.userId
            const {name, cards} = req.body

            if (!name || !cards) {
                res.status(400).json({error: 'Le nom et les cartes sont requis'})
                return
            }

            if (!userId) {
                res.status(401).json({error: 'Utilisateur non authentifié'})
                return
            }

            if (!Array.isArray(cards)) {
                res.status(400).json({error: 'Les cartes doivent être un tableau'})
                return
            }

            const newDeck = await decksService.createDeck(userId, name, cards)
            res.status(201).json({
                message: 'Deck créé avec succès',
                deck: newDeck,
            })
        } catch (error) {
            if (error instanceof Error && error.message === 'ERREUR_NB_CARTES') {
                res.status(400).json({error: 'Un deck doit contenir exactement 10 cartes'})
                return
            }

            if (error instanceof Error && error.message === 'ERREUR_CARTES_INVALIDES') {
                res.status(400).json({error: 'Certaines cartes n\'existent pas'})
                return
            }

            console.error('Erreur lors de la création du deck:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }

    async getDecksByUserId(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.userId
            if (!userId) {
                res.status(401).json({error: 'Utilisateur non authentifié'})
                return
            }
            const decks = await decksService.getDecksByUserId(userId)
            if (decks.length === 0) {
                res.status(200).json({message: 'Aucun deck trouvé pour cet utilisateur'})
            } else {
                res.status(200).json({decks})
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des decks:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }

    async getDeckById(req: Request, res: Response): Promise<void> {
        try {
            const deckId = parseInt(req.params.id, 10)
            const deck = await decksService.getDeckById(deckId, req.userId!)
            if (!deck) {
                res.status(404).json({error: 'Deck inexistant'})
                return
            } else if (deck.userId !== req.userId) {
                res.status(403).json({error: 'Accès refusé à ce deck'})
                return
            } else {
                res.status(200).json({deck})
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du deck:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }

    async patchDeck(req: Request, res: Response): Promise<void> {
        try {
            const deckId = parseInt(req.params.id, 10)
            const {name, cards} = req.body
            const updatedDeck = await decksService.patchDeck(deckId, req.userId!, name, cards)
            if (!updatedDeck) {
                res.status(404).json({error: 'Deck inexistant'})
                return
            } else if (updatedDeck.userId !== req.userId) {
                res.status(403).json({error: 'Accès refusé à ce deck'})
                return
            } else {
                res.status(200).json({
                    message: 'Deck mis à jour avec succès',
                    deck: updatedDeck,
                })
            }
        } catch (error) {
            if (error instanceof Error && error.message === 'ERREUR_NB_CARTES') {
                res.status(400).json({error: 'Un deck doit contenir exactement 10 cartes'})
                return
            }
            if (error instanceof Error && error.message === 'ERREUR_CARTES_INVALIDES') {
                res.status(400).json({error: 'Certaines cartes n\'existent pas'})
                return
            }
            console.error('Erreur lors de la mise à jour du deck:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }

    async deleteDeck(req: Request, res: Response): Promise<void> {
        try {
            const deckId = parseInt(req.params.id, 10)
            const deck = await decksService.getDeckById(deckId, req.userId!)
            if (!deck) {
                res.status(404).json({error: 'Deck inexistant'})
                return
            } else if (deck.userId !== req.userId) {
                res.status(403).json({error: 'Accès refusé à ce deck'})
                return
            }
            await decksService.deleteDeck(deckId, req.userId!)
            res.status(200).json({message: 'Deck supprimé avec succès'})
        } catch (error) {
            console.error('Erreur lors de la suppression du deck:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }
}

export const decksController = new DecksController()