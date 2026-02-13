import { Router } from 'express'
import { cardsController } from '../controllers/cards.controller'

export const cardsRouter = Router()

/**
 * Route de récupération de toutes les cartes
 *
 * Retourne la liste complète des cartes Pokémon disponibles,
 * triées par numéro de Pokédex (ordre croissant).
 *
 * @route GET /cards
 * @access Public
 *
 * @returns {200} Liste des cartes - Tableau de cartes avec leurs détails (id, name, hp, attack, type, pokedexNumber, imgUrl)
 * @returns {500} Erreur serveur - Erreur lors de la récupération
 *
 * @example
 * // GET /cards
 * // Réponse 200:
 * [
 *   {"id": 1, "name": "Bulbasaur", "hp": 45, "attack": 49, "type": "Grass", "pokedexNumber": 1, "imgUrl": "bulbasaur.png", ...},
 *   {"id": 2, "name": "Ivysaur", "hp": 60, "attack": 62, "type": "Grass", "pokedexNumber": 2, "imgUrl": "ivysaur.png", ...}
 * ]
 */
cardsRouter.get('/', (req, res) => cardsController.getAllCards(req, res))
