import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as controller from './controller'

export const ridesRouter = Router()

// ── Public ───────────────────────────────────────────────────────────────────
ridesRouter.get('/', controller.searchRides)
ridesRouter.get('/mine', requireAuth, controller.getMyRides) // must come before /:id
ridesRouter.get('/:id', controller.getRide)

// ── Driver only ───────────────────────────────────────────────────────────────
ridesRouter.post('/', requireAuth, controller.createRide)
ridesRouter.patch('/:id/status', requireAuth, controller.updateRideStatus)
ridesRouter.delete('/:id', requireAuth, controller.cancelRide)
