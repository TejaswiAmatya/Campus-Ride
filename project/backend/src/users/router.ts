import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { upload } from '../middleware/upload'
import * as authController from './authController'
import * as userController from './userController'

export const usersRouter = Router()
export const authRouter = Router()

// Auth routes
authRouter.post('/register', authController.register)
authRouter.post('/login', authController.login)

// Public user routes
usersRouter.get('/:id/reviews', userController.getUserReviews)

// Authenticated routes
usersRouter.get('/me', requireAuth, userController.getCurrentUser)
usersRouter.patch('/me', requireAuth, userController.updateCurrentUser)
usersRouter.post('/me/avatar', requireAuth, upload.single('avatar'), userController.uploadCurrentUserAvatar)
usersRouter.post(
  '/me/academic-verification',
  requireAuth,
  upload.single('document'),
  userController.submitAcademicVerification,
)
usersRouter.post(
  '/me/driver',
  requireAuth,
  upload.fields([
    { name: 'licence', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
  ]),
  userController.applyAsDriver,
)
