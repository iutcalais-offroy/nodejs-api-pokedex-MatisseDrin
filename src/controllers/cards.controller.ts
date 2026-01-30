import {Request, Response} from 'express'
import {cardsService} from '../services/cards.service'

export class CardsController {
    async getAllCards(_req: Request, res: Response): Promise<void> {
        try {
            const cards = await cardsService.getAllCards()

            res.status(200).json(cards)
        } catch (error) {
            console.error('Erreur lors de la récupération des cartes:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }
}

export const cardsController = new CardsController()