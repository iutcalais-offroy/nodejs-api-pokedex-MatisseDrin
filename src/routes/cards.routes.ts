import {Router} from 'express'
import {cardsController} from '../controllers/cards.controller'

export const cardsRouter = Router()

// GET /cards - Récupérer toutes les cartes triées par pokedexNumber
cardsRouter.get('/', (req, res) => cardsController.getAllCards(req, res))