import {prisma} from '../database'

export class CardsService {
    async getAllCards() {
        const cards = await prisma.card.findMany({
            orderBy: {
                pokedexNumber: 'asc',
            },
        })

        return cards
    }
}

export const cardsService = new CardsService()