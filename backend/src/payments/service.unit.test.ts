import { PaymentStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('payments', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T08:30:00.000Z'))
  })

  async function loadPayments() {
    const module = await import('./service')
    return module.payments
  }

  it('captures positive payments and returns the same capture on repeat calls', async () => {
    const payments = await loadPayments()

    const first = await payments.capture({
      amount: '125.50',
      currency: 'NOK',
      bookingId: 'booking-1',
      rideId: 'ride-1',
      passengerId: 'passenger-1',
    })
    const second = await payments.capture({
      amount: '125.50',
      currency: 'NOK',
      bookingId: 'booking-1',
      rideId: 'ride-1',
      passengerId: 'passenger-1',
    })

    expect(first).toEqual({
      provider: 'simulated',
      providerPaymentId: 'sim-pay-booking-1',
      status: PaymentStatus.PAID,
      paidAt: new Date('2026-05-10T08:30:00.000Z'),
    })
    expect(second).toEqual(first)
  })

  it('fails capture for zero or negative amounts', async () => {
    const payments = await loadPayments()

    await expect(
      payments.capture({
        amount: 0,
        currency: 'NOK',
        bookingId: 'booking-zero',
        rideId: 'ride-1',
        passengerId: 'passenger-1',
      }),
    ).resolves.toEqual({
      provider: 'simulated',
      providerPaymentId: 'sim-failed-booking-zero',
      status: PaymentStatus.FAILED,
      paidAt: null,
    })
  })

  it('returns refunded status when the full captured amount is refunded', async () => {
    const payments = await loadPayments()

    await payments.capture({
      amount: 80,
      currency: 'NOK',
      bookingId: 'booking-2',
      rideId: 'ride-2',
      passengerId: 'passenger-2',
    })

    const refund = await payments.refund({
      bookingId: 'booking-2',
      providerPaymentId: 'sim-pay-booking-2',
      amount: 80,
      reason: 'DRIVER_DECLINE',
    })

    expect(refund).toEqual({
      provider: 'simulated',
      providerRefundId: 'sim-refund-booking-2',
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date('2026-05-10T08:30:00.000Z'),
    })
  })

  it('returns partially refunded status for partial refunds and is idempotent', async () => {
    const payments = await loadPayments()

    await payments.capture({
      amount: 100,
      currency: 'NOK',
      bookingId: 'booking-3',
      rideId: 'ride-3',
      passengerId: 'passenger-3',
    })

    const first = await payments.refund({
      bookingId: 'booking-3',
      providerPaymentId: 'sim-pay-booking-3',
      amount: 40,
      reason: 'PASSENGER_CANCELLATION',
    })
    const second = await payments.refund({
      bookingId: 'booking-3',
      providerPaymentId: 'sim-pay-booking-3',
      amount: 10,
      reason: 'PASSENGER_CANCELLATION',
    })

    expect(first.status).toBe(PaymentStatus.PARTIALLY_REFUNDED)
    expect(second).toEqual(first)
  })

  it('leaves payment status as paid when refund amount is zero', async () => {
    const payments = await loadPayments()

    await payments.capture({
      amount: 50,
      currency: 'NOK',
      bookingId: 'booking-4',
      rideId: 'ride-4',
      passengerId: 'passenger-4',
    })

    const refund = await payments.refund({
      bookingId: 'booking-4',
      providerPaymentId: 'sim-pay-booking-4',
      amount: 0,
      reason: 'NO_SHOW',
    })

    expect(refund).toEqual({
      provider: 'simulated',
      providerRefundId: null,
      status: PaymentStatus.PAID,
      refundedAt: null,
    })
  })
})
