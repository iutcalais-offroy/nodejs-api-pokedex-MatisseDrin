import {prisma} from '../database'

export class DecksService {
    async createDeck(userId: number, name: string, cardId: number[]) {

        if (cardId.length !== 10) {
            throw new Error('ERREUR_NB_CARTES')
        }

        const existingCards = await prisma.card.findMany({
            where: {
                id: { in: cardId },
            },
        })

        const existingIds = new Set(existingCards.map(card => card.id))
        const allIdsExist = cardId.every(id => existingIds.has(id))

        if (!allIdsExist) {
            throw new Error('ERREUR_CARTES_INVALIDES')
        }

        const newDeck = await prisma.deck.create({
            data: {
                name,
                userId,
                deckCard: {
                    create: cardId.map((cardId) => ({ cardId })),
                },
            },
            include: {
                deckCard: {
                    include: { card: true },
                },
            },
        })

        return newDeck
    }

    async getDecksByUserId(userId: number) {
        const decks = await prisma.deck.findMany({
            where: { userId },
            include: {
                deckCard: {
                    include: { card: true },
                },
            },
        })
        return decks
    }

    async getDeckById(deckId: number, userId: number) {
        const deck = await prisma.deck.findUnique({
            where: { id: deckId, userId },
            include: {
                deckCard: {
                    include: { card: true },
                },
            },
        })
        return deck
    }

    async patchDeck(deckId: number, _userId: number, name?: string, cardId?: number[]) {
        const updateData: any = {}
        if (name) {
            updateData.name = name
        }
        if (cardId) {
            if (cardId.length !== 10) {
                throw new Error('ERREUR_NB_CARTES')
            }
            const existingCards = await prisma.card.findMany({
                where: {
                    id: { in: cardId },
                },
            })
            const existingIds = new Set(existingCards.map(card => card.id))
            const allIdsExist = cardId.every(id => existingIds.has(id))
            if (!allIdsExist) {
                throw new Error('ERREUR_CARTES_INVALIDES')
            }
            await prisma.deckCard.deleteMany({ where: { deckId } })
            updateData.deckCard = {
                create: cardId.map((cardId) => ({ cardId })),
            }
        }
        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: updateData,
            include: {
                deckCard: {
                    include: { card: true },
                },
            },
        })
        return updatedDeck
    }

    async deleteDeck(deckId: number, userId: number) {
        const deck = await prisma.deck.findUnique({
            where: { id: deckId, userId },
        })
        if (!deck) {
            return null
        }
        await prisma.deckCard.deleteMany({ where: { deckId } })
        await prisma.deck.delete({ where: { id: deckId } })
        return deck
    }
}

export const decksService = new DecksService()