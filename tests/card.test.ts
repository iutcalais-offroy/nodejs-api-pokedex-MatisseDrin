import {describe, expect, it, vi, beforeEach} from 'vitest'
import request from 'supertest'
import express from 'express'
import {cardsRouter} from '../src/routes/cards.routes'
import {prismaMock} from './vitest.setup'

const app = express()
app.use(express.json())
app.use('/cards', cardsRouter)

describe('Cards Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /cards', () => {
        it('devrait retourner toutes les cartes triées par numéro de Pokédex', async () => {
            const mockCards = [
                {
                    id: 1,
                    pokedexNumber: 1,
                    name: 'Bulbasaur',
                    imgUrl: 'bulbasaur.png',
                    hp: 45,
                    attack: 49,
                    type: 'Grass' as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 4,
                    pokedexNumber: 4,
                    name: 'Charmander',
                    imgUrl: 'charmander.png',
                    hp: 39,
                    attack: 52,
                    type: 'Fire' as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 7,
                    pokedexNumber: 7,
                    name: 'Squirtle',
                    imgUrl: 'squirtle.png',
                    hp: 44,
                    attack: 48,
                    type: 'Water' as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            prismaMock.card.findMany.mockResolvedValue(mockCards)

            const response = await request(app).get('/cards')

            expect(response.status).toBe(200)
            expect(response.body).toMatchObject(mockCards.map((card) => ({
                ...card,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            })))
            expect(prismaMock.card.findMany).toHaveBeenCalledWith({
                orderBy: {
                    pokedexNumber: 'asc',
                },
            })
        })

        it('devrait retourner un tableau vide si aucune carte n\'existe', async () => {
            prismaMock.card.findMany.mockResolvedValue([])

            const response = await request(app).get('/cards')

            expect(response.status).toBe(200)
            expect(response.body).toEqual([])
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('Database error'))

            const response = await request(app).get('/cards')

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })
})
