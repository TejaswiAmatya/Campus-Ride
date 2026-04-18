import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as controller from './controller'

export const usersRouter = Router()

// ── Public ───────────────────────────────────────────────────────────────────
usersRouter.post('/register', controller.register)
usersRouter.post('/login', controller.login)
usersRouter.get('/:id/reviews', controller.getDriverReviews)

// ── Authenticated ────────────────────────────────────────────────────────────
usersRouter.get('/me', requireAuth, controller.getMe)
usersRouter.patch('/me', requireAuth, controller.updateMe)
usersRouter.post('/me/driver', requireAuth, controller.applyAsDriver)
