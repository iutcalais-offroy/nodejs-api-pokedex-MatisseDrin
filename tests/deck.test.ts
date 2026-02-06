import {describe, expect, it, vi, beforeEach} from 'vitest'
import request from 'supertest'
import express from 'express'
import {decksRouter} from '../src/routes/decks.routes'
import {prismaMock} from './vitest.setup'
import jwt from 'jsonwebtoken'
import type {Deck, Card, DeckCard, Prisma} from '../src/generated/prisma/client'

const app = express()
app.use(express.json())
app.use('/decks', decksRouter)

// Mock du JWT
vi.mock('jsonwebtoken')

describe('Decks Routes', () => {
    const mockToken = 'mock-jwt-token'
    const mockUserId = 1

    beforeEach(() => {
        vi.clearAllMocks()
        // Mock de la vérification JWT
        vi.mocked(jwt.verify).mockReturnValue({
            userId: mockUserId,
            email: 'test@example.com',
            username: 'testuser',
        } as unknown as void)
    })

    describe('POST /decks', () => {
        it('devrait créer un nouveau deck avec succès', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: mockUserId,
                deckCard: [
                    {id: 1, deckId: 1, cardId: 1, card: {id: 1, name: 'Bulbasaur', pokedexNumber: 1, imgUrl: 'bulbasaur.png', hp: 45, attack: 49, type: 'Grass' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 2, deckId: 1, cardId: 2, card: {id: 2, name: 'Ivysaur', pokedexNumber: 2, imgUrl: 'ivysaur.png', hp: 60, attack: 62, type: 'Grass' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 3, deckId: 1, cardId: 3, card: {id: 3, name: 'Venusaur', pokedexNumber: 3, imgUrl: 'venusaur.png', hp: 80, attack: 82, type: 'Grass' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 4, deckId: 1, cardId: 4, card: {id: 4, name: 'Charmander', pokedexNumber: 4, imgUrl: 'charmander.png', hp: 39, attack: 52, type: 'Fire' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 5, deckId: 1, cardId: 5, card: {id: 5, name: 'Charmeleon', pokedexNumber: 5, imgUrl: 'charmeleon.png', hp: 58, attack: 64, type: 'Fire' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 6, deckId: 1, cardId: 6, card: {id: 6, name: 'Charizard', pokedexNumber: 6, imgUrl: 'charizard.png', hp: 78, attack: 84, type: 'Fire' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 7, deckId: 1, cardId: 7, card: {id: 7, name: 'Squirtle', pokedexNumber: 7, imgUrl: 'squirtle.png', hp: 44, attack: 48, type: 'Water' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 8, deckId: 1, cardId: 8, card: {id: 8, name: 'Wartortle', pokedexNumber: 8, imgUrl: 'wartortle.png', hp: 59, attack: 63, type: 'Water' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 9, deckId: 1, cardId: 9, card: {id: 9, name: 'Blastoise', pokedexNumber: 9, imgUrl: 'blastoise.png', hp: 79, attack: 83, type: 'Water' as const, createdAt: new Date(), updatedAt: new Date()}},
                    {id: 10, deckId: 1, cardId: 10, card: {id: 10, name: 'Caterpie', pokedexNumber: 10, imgUrl: 'caterpie.png', hp: 45, attack: 30, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()}},
                ],
            }

            prismaMock.card.findMany.mockResolvedValue(
                mockDeck.deckCard.map(dc => dc.card)
            )
            prismaMock.deck.create.mockResolvedValue(mockDeck as Deck & { deckCard: (DeckCard & { card: Card })[] })

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(201)
            expect(response.body.message).toBe('Deck créé avec succès')
            expect(response.body.deck).toMatchObject({
                id: mockDeck.id,
                name: mockDeck.name,
                userId: mockDeck.userId,
                deckCard: expect.any(Array),
            })
        })

        it('devrait retourner 400 si le nom est manquant', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Le nom et les cartes sont requis')
        })

        it('devrait retourner 400 si les cartes sont manquantes', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Mon Deck',
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Le nom et les cartes sont requis')
        })

        it('devrait retourner 400 si les cartes ne sont pas un tableau', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: 'not-an-array',
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Les cartes doivent être un tableau')
        })

        it('devrait retourner 400 si le deck ne contient pas exactement 10 cartes', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Un deck doit contenir exactement 10 cartes')
        })

        it('devrait retourner 400 si certaines cartes n\'existent pas', async () => {
            prismaMock.card.findMany.mockResolvedValue([
                {id: 1, name: 'Bulbasaur', pokedexNumber: 1, imgUrl: 'bulbasaur.png', hp: 45, attack: 49, type: 'Grass' as const, createdAt: new Date(), updatedAt: new Date()},
            ])

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 999],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Certaines cartes n\'existent pas')
        })

        it('devrait retourner 401 si le token est manquant', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Token missing')
            })

            const response = await request(app)
                .post('/decks')
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })

    describe('GET /decks/mine', () => {
        it('devrait retourner tous les decks de l\'utilisateur', async () => {
            const mockDecks = [
                {
                    id: 1,
                    name: 'Deck 1',
                    userId: mockUserId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deckCard: [],
                },
                {
                    id: 2,
                    name: 'Deck 2',
                    userId: mockUserId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deckCard: [],
                },
            ]

            prismaMock.deck.findMany.mockResolvedValue(mockDecks as (Deck & { deckCard: DeckCard[] })[])

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(200)
            expect(response.body.decks).toMatchObject(mockDecks.map((deck) => ({
                id: deck.id,
                name: deck.name,
                userId: deck.userId,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
                deckCard: deck.deckCard,
            })))
        })

        it('devrait retourner un message si aucun deck n\'existe', async () => {
            prismaMock.deck.findMany.mockResolvedValue([])

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Aucun deck trouvé pour cet utilisateur')
        })

        it('devrait retourner 401 si le token est manquant', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Token missing')
            })

            const response = await request(app).get('/decks/mine')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.deck.findMany.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })

    describe('GET /decks/:id', () => {
        it('devrait retourner un deck spécifique', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: mockUserId,
                createdAt: new Date(),
                updatedAt: new Date(),
                deckCard: [],
            }

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(200)
            expect(response.body.deck).toMatchObject({
                id: mockDeck.id,
                name: mockDeck.name,
                userId: mockDeck.userId,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
                deckCard: mockDeck.deckCard,
            })
        })

        it('devrait retourner 404 si le deck n\'existe pas', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null)

            const response = await request(app)
                .get('/decks/999')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Deck inexistant')
        })

        it('devrait retourner 403 si l\'utilisateur n\'a pas accès au deck', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 999, // Différent du mockUserId
                createdAt: new Date(),
                updatedAt: new Date(),
                deckCard: [],
            }

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Accès refusé à ce deck')
        })

        it('devrait retourner 401 si le token est manquant', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Token missing')
            })

            const response = await request(app).get('/decks/1')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })

    describe('PATCH /decks/:id', () => {
        it('devrait mettre à jour le nom du deck', async () => {
            const mockDeck = {
                id: 1,
                name: 'Nom Mis à Jour',
                userId: mockUserId,
                createdAt: new Date(),
                updatedAt: new Date(),
                deckCard: [],
            }

            prismaMock.deck.update.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Nom Mis à Jour',
                })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck mis à jour avec succès')
            expect(response.body.deck.name).toBe('Nom Mis à Jour')
        })

        it('devrait mettre à jour les cartes du deck', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: mockUserId,
                deckCard: [
                    {id: 1, deckId: 1, cardId: 11, card: {id: 11, name: 'Metapod', pokedexNumber: 11, imgUrl: 'metapod.png', hp: 50, attack: 20, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()}},
                ],
            }

            prismaMock.card.findMany.mockResolvedValue([
                {id: 11, name: 'Metapod', pokedexNumber: 11, imgUrl: 'metapod.png', hp: 50, attack: 20, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 12, name: 'Butterfree', pokedexNumber: 12, imgUrl: 'butterfree.png', hp: 60, attack: 45, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 13, name: 'Weedle', pokedexNumber: 13, imgUrl: 'weedle.png', hp: 40, attack: 35, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 14, name: 'Kakuna', pokedexNumber: 14, imgUrl: 'kakuna.png', hp: 45, attack: 25, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 15, name: 'Beedrill', pokedexNumber: 15, imgUrl: 'beedrill.png', hp: 65, attack: 90, type: 'Bug' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 16, name: 'Pidgey', pokedexNumber: 16, imgUrl: 'pidgey.png', hp: 40, attack: 45, type: 'Flying' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 17, name: 'Pidgeotto', pokedexNumber: 17, imgUrl: 'pidgeotto.png', hp: 63, attack: 60, type: 'Flying' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 18, name: 'Pidgeot', pokedexNumber: 18, imgUrl: 'pidgeot.png', hp: 83, attack: 80, type: 'Flying' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 19, name: 'Rattata', pokedexNumber: 19, imgUrl: 'rattata.png', hp: 30, attack: 56, type: 'Normal' as const, createdAt: new Date(), updatedAt: new Date()},
                {id: 20, name: 'Raticate', pokedexNumber: 20, imgUrl: 'raticate.png', hp: 55, attack: 81, type: 'Normal' as const, createdAt: new Date(), updatedAt: new Date()},
            ])
            prismaMock.deckCard.deleteMany.mockResolvedValue({count: 10} as Prisma.BatchPayload)
            prismaMock.deck.update.mockResolvedValue(mockDeck as Deck & { deckCard: (DeckCard & { card: Card })[] })

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    cards: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck mis à jour avec succès')
        })

        it('devrait retourner 400 si le nombre de cartes est incorrect', async () => {
            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    cards: [1, 2, 3],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Un deck doit contenir exactement 10 cartes')
        })

        it('devrait retourner 400 si certaines cartes n\'existent pas', async () => {
            prismaMock.card.findMany.mockResolvedValue([
                {id: 1, name: 'Bulbasaur', pokedexNumber: 1, imgUrl: 'bulbasaur.png', hp: 45, attack: 49, type: 'Grass' as const, createdAt: new Date(), updatedAt: new Date()},
            ])

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 999],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Certaines cartes n\'existent pas')
        })

        it('devrait retourner 404 si le deck n\'existe pas (service retourne null)', async () => {
            prismaMock.deck.update.mockResolvedValue(null as unknown as Deck)

            const response = await request(app)
                .patch('/decks/999')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Nouveau Nom',
                })

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Deck inexistant')
        })

        it('devrait retourner 403 si le deck appartient à un autre utilisateur', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 999,
                createdAt: new Date(),
                updatedAt: new Date(),
                deckCard: [],
            }

            prismaMock.deck.update.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Nouveau Nom',
                })

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Accès refusé à ce deck')
        })

        it('devrait retourner 401 si le token est manquant', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Token missing')
            })

            const response = await request(app)
                .patch('/decks/1')
                .send({
                    name: 'Nouveau Nom',
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.deck.update.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    name: 'Nouveau Nom',
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })

    describe('DELETE /decks/:id', () => {
        it('devrait supprimer un deck avec succès', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: mockUserId,
                createdAt: new Date(),
                updatedAt: new Date(),
                deckCard: [],
            }

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })
            prismaMock.deckCard.deleteMany.mockResolvedValue({count: 10} as Prisma.BatchPayload)
            prismaMock.deck.delete.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })

            const response = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck supprimé avec succès')
        })

        it('devrait retourner 404 si le deck n\'existe pas', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null)

            const response = await request(app)
                .delete('/decks/999')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Deck inexistant')
        })

        it('devrait retourner 403 si l\'utilisateur n\'a pas accès au deck', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 999, // Différent du mockUserId
                createdAt: new Date(),
                updatedAt: new Date(),
                deckCard: [],
            }

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck as Deck & { deckCard: DeckCard[] })

            const response = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Accès refusé à ce deck')
        })

        it('devrait retourner 401 si le token est manquant', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Token missing')
            })

            const response = await request(app).delete('/decks/1')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })
})
