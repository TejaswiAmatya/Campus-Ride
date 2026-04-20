import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as controller from './userController'

export const usersRouter = Router()

// Public routes
usersRouter.post('/register', controller.register)
usersRouter.post('/login', controller.login)
usersRouter.get('/:id/reviews', controller.getDriverReviews)

// Authenticated routes
usersRouter.get('/me', requireAuth, controller.getCurrentUser)
usersRouter.patch('/me', requireAuth, controller.updateCurrentUser)
usersRouter.post('/me/driver', requireAuth, controller.applyAsDriver)
