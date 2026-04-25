import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as controller from './controller'

export const bookingsRouter = Router()

// All booking routes require authentication
bookingsRouter.use(requireAuth)

bookingsRouter.post('/', controller.createBooking)
bookingsRouter.get('/', controller.listBookings)
bookingsRouter.get('/earnings', controller.getEarnings)
bookingsRouter.get('/:id', controller.getBooking)
bookingsRouter.patch('/:id/confirm', controller.confirmBooking)
bookingsRouter.patch('/:id/decline', controller.declineBooking)
bookingsRouter.patch('/:id/cancel', controller.cancelBooking)
// bookingsRouter.post('/:id/review', controller.createReview)
