import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import * as controller from './controller'

export const adminRouter = Router()

// ── Public config (read-only) ─────────────────────────────────────────────────
adminRouter.get('/config', controller.getConfig)

// ── Authenticated users can file reports ─────────────────────────────────────
adminRouter.post('/reports', requireAuth, controller.createReport)

// ── Admin-only ────────────────────────────────────────────────────────────────
adminRouter.use(requireAuth, requireRole('ADMIN'))

adminRouter.get('/stats', controller.getStats)
adminRouter.get('/drivers/pending', controller.listPendingDrivers)
adminRouter.patch('/drivers/:id/decision', controller.driverDecision)
adminRouter.get('/reports', controller.listReports)
adminRouter.patch('/reports/:id', controller.resolveReport)
adminRouter.patch('/config', controller.updateConfig)
