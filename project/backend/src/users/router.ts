import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as authController from './authController'
import * as userController from './userController'

export const usersRouter = Router()
export const authRouter = Router()

// Auth routes
authRouter.post('/register', authController.register)
authRouter.post('/login', authController.login)

// Public user routes
usersRouter.get('/:id/reviews', userController.getDriverReviews)

// Authenticated routes
usersRouter.get('/me', requireAuth, userController.getCurrentUser)
usersRouter.patch('/me', requireAuth, userController.updateCurrentUser)
usersRouter.post('/me/driver', requireAuth, userController.applyAsDriver)
