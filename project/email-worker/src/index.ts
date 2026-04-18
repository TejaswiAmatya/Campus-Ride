/**
 * Campus Ride — Email Worker
 *
 * Consumes jobs from the BullMQ "emails" queue and sends transactional emails.
 *
 * Current state: STUB — logs every job to stdout, no real emails sent.
 *
 * To wire up real email sending, replace the switch block below with one of:
 *
 *   Option A: Nodemailer (SMTP)
 *   ──────────────────────────
 *   npm install nodemailer @types/nodemailer
 *
 *   import nodemailer from 'nodemailer'
 *   const transporter = nodemailer.createTransport({
 *     host: process.env.SMTP_HOST,
 *     port: Number(process.env.SMTP_PORT),
 *     secure: false,
 *     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
 *   })
 *   await transporter.sendMail({
 *     from: process.env.SMTP_FROM,
 *     to: job.data.recipientEmail,
 *     subject: getSubject(job.data.type),
 *     html: renderTemplate(job.data.type, job.data.payload),
 *   })
 *
 *   Option B: Resend
 *   ─────────────────
 *   npm install resend
 *
 *   import { Resend } from 'resend'
 *   const resend = new Resend(process.env.RESEND_API_KEY)
 *   await resend.emails.send({
 *     from: process.env.EMAIL_FROM ?? 'Campus Ride <no-reply@campus-ride.app>',
 *     to: job.data.recipientEmail,
 *     subject: getSubject(job.data.type),
 *     html: renderTemplate(job.data.type, job.data.payload),
 *   })
 */

import { Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'

const QUEUE_NAME = 'emails'
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

// ── Job payload type ──────────────────────────────────────────────────────────

type EmailJobType =
  | 'welcome'
  | 'booking-confirmed'
  | 'booking-cancelled'
  | 'ride-started'
  | 'driver-approved'
  | 'driver-rejected'

interface EmailJobData {
  type: EmailJobType
  recipientEmail: string
  payload: Record<string, unknown>
}

// ── Worker ────────────────────────────────────────────────────────────────────

async function processJob(job: Job<EmailJobData>): Promise<void> {
  const { type, recipientEmail, payload } = job.data
  console.log(`[email-worker] Processing job ${job.id}: ${type} → ${recipientEmail}`)
  console.log(`[email-worker] Payload: ${JSON.stringify(payload)}`)

  // TODO: replace the stubs below with real email sending (see top-of-file instructions)
  switch (type) {
    case 'welcome':
      console.log(`[email-worker] [STUB] Would send welcome email to ${recipientEmail}`)
      // Subject: "Welcome to Campus Ride, {name}!"
      break

    case 'booking-confirmed':
      console.log(`[email-worker] [STUB] Would send booking confirmation to ${recipientEmail}`)
      // Subject: "Your booking is confirmed — {rideName}"
      break

    case 'booking-cancelled':
      console.log(`[email-worker] [STUB] Would send cancellation notice to ${recipientEmail}`)
      // Subject: "Booking cancelled — {rideName}"
      break

    case 'ride-started':
      console.log(`[email-worker] [STUB] Would send ride-started notification to ${recipientEmail}`)
      // Subject: "Your ride has started"
      break

    case 'driver-approved':
      console.log(`[email-worker] [STUB] Would send driver approval email to ${recipientEmail}`)
      // Subject: "You're approved to drive on Campus Ride!"
      break

    case 'driver-rejected':
      console.log(`[email-worker] [STUB] Would send driver rejection email to ${recipientEmail}`)
      // Subject: "Update on your Campus Ride driver application"
      break

    default: {
      const exhaustive: never = type
      console.warn(`[email-worker] Unknown job type: ${exhaustive}`)
    }
  }
}

const worker = new Worker<EmailJobData>(QUEUE_NAME, processJob, {
  connection,
  concurrency: 5,
})

worker.on('completed', (job) => {
  console.log(`[email-worker] Job ${job.id} completed successfully`)
})

worker.on('failed', (job, err) => {
  console.error(`[email-worker] Job ${job?.id} failed: ${err.message}`)
})

worker.on('error', (err) => {
  console.error('[email-worker] Worker error:', err.message)
})

console.log(`[email-worker] Listening on queue "${QUEUE_NAME}" at ${redisUrl}`)

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown() {
  console.log('[email-worker] Shutting down gracefully…')
  await worker.close()
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
