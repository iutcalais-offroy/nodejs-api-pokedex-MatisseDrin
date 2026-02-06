import {describe, expect, it, vi, beforeEach} from 'vitest'
import request from 'supertest'
import express from 'express'
import {authRouter} from '../src/routes/auth.routes'
import {prismaMock} from './vitest.setup'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())
app.use('/auth', authRouter)

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('POST /auth/sign-up', () => {
        it('devrait créer un nouvel utilisateur avec succès', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            prismaMock.user.findUnique.mockResolvedValue(null)
            prismaMock.user.create.mockResolvedValue(mockUser)

            vi.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword' as never))
            vi.spyOn(jwt, 'sign').mockImplementation(() => 'mock-token' as never)

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123',
                })

            expect(response.status).toBe(201)
            expect(response.body).toHaveProperty('token')
            expect(response.body.message).toBe('Utilisateur créé avec succès')
            expect(response.body.user).toEqual({
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            })
        })

        it('devrait retourner 400 si des champs sont manquants', async () => {
            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Tous les champs sont requis (username, email, password)')
        })

        it('devrait retourner 409 si l\'utilisateur existe déjà', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                username: 'existinguser',
                email: 'test@example.com',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123',
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe('Un utilisateur avec cet email existe déjà')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123',
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })

    describe('POST /auth/sign-in', () => {
        it('devrait connecter un utilisateur avec succès', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true as never))
            vi.spyOn(jwt, 'sign').mockImplementation(() => 'mock-token' as never)

            const response = await request(app)
                .post('/auth/sign-in')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                })

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('token')
            expect(response.body.message).toBe('Connexion réussie')
            expect(response.body.user).toEqual({
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            })
        })

        it('devrait retourner 400 si des champs sont manquants', async () => {
            const response = await request(app)
                .post('/auth/sign-in')
                .send({
                    email: 'test@example.com',
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Tous les champs sont requis (email, password)')
        })

        it('devrait retourner 401 si l\'utilisateur n\'existe pas', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const response = await request(app)
                .post('/auth/sign-in')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Email ou mot de passe incorrect')
        })

        it('devrait retourner 401 si le mot de passe est incorrect', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false as never))

            const response = await request(app)
                .post('/auth/sign-in')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Email ou mot de passe incorrect')
        })

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .post('/auth/sign-in')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })
})