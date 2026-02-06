import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../src/middlewares/auth.middleware'
import jwt from 'jsonwebtoken'

// Mock de jwt
vi.mock('jsonwebtoken')

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      headers: {},
    }

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    mockNext = vi.fn()
  })

  describe('authenticateToken', () => {
    it('devrait authentifier avec un token valide', () => {
      const mockToken = 'valid-jwt-token'
      const mockDecoded = {
        userId: 1,
        email: 'test@example.com',
        username: 'testuser',
      }

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      }

      vi.mocked(jwt.verify).mockReturnValue(mockDecoded as unknown as void)

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
      expect(mockRequest.userId).toBe(1)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('devrait retourner 401 si le token est manquant', () => {
      mockRequest.headers = {}

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token manquant',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("devrait retourner 401 si l'en-tête Authorization est vide", () => {
      mockRequest.headers = {
        authorization: '',
      }

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token manquant',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('devrait retourner 401 si le format du token est invalide', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      }

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token manquant',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('devrait retourner 401 si le token est invalide', () => {
      const mockToken = 'invalid-jwt-token'

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      }

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token invalide ou expiré',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('devrait retourner 401 si le token a expiré', () => {
      const mockToken = 'expired-jwt-token'

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      }

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt expired')
      })

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token invalide ou expiré',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('devrait gérer un token avec seulement "Bearer"', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      }

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token manquant',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('devrait extraire correctement le userId du token décodé', () => {
      const mockToken = 'valid-jwt-token'
      const mockDecoded = {
        userId: 42,
        email: 'user@example.com',
        username: 'username',
      }

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      }

      vi.mocked(jwt.verify).mockReturnValue(mockDecoded as unknown as void)

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockRequest.userId).toBe(42)
      expect(mockNext).toHaveBeenCalled()
    })
  })
})
