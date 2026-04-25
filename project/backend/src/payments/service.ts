import { Prisma, PaymentStatus } from "@prisma/client";

export interface CapturePaymentInput {
  amount: Prisma.Decimal | string | number;
  currency: string;
  bookingId: string;
  rideId: string;
  passengerId: string;
}

export interface CapturePaymentResult {
  provider: string;
  providerPaymentId: string;
  status: PaymentStatus;
  paidAt: Date | null;
}

export interface RefundPaymentInput {
  bookingId: string;
  providerPaymentId?: string | null;
  amount: Prisma.Decimal | string | number;
  reason: "PASSENGER_CANCELLATION" | "NO_SHOW";
}

export interface RefundPaymentResult {
  provider: string;
  providerRefundId: string | null;
  status: PaymentStatus;
  refundedAt: Date | null;
}

export interface PaymentProvider {
  capture(input: CapturePaymentInput): Promise<CapturePaymentResult>;
  refund(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}

class SimulatedPaymentProvider implements PaymentProvider {
  private captures = new Map<string, CapturePaymentResult>();
  private captureAmounts = new Map<string, Prisma.Decimal>();
  private refunds = new Map<string, RefundPaymentResult>();

  async capture(input: CapturePaymentInput): Promise<CapturePaymentResult> {
    const existingCapture = this.captures.get(input.bookingId);
    if (existingCapture) {
      return existingCapture;
    }

    const amount = new Prisma.Decimal(input.amount.toString());
    if (amount.lte(0)) {
      return {
        provider: "simulated",
        providerPaymentId: `sim-failed-${input.bookingId}`,
        status: PaymentStatus.FAILED,
        paidAt: null,
      };
    }

    const captureResult: CapturePaymentResult = {
      provider: "simulated",
      providerPaymentId: `sim-pay-${input.bookingId}`,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
    };

    this.captureAmounts.set(input.bookingId, amount);
    this.captures.set(input.bookingId, captureResult);
    return captureResult;
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const existingRefund = this.refunds.get(input.bookingId);
    if (existingRefund) {
      return existingRefund;
    }

    const amount = new Prisma.Decimal(input.amount.toString());
    const capturedAmount =
      this.captureAmounts.get(input.bookingId) ?? new Prisma.Decimal(0);
    const refundResult: RefundPaymentResult =
      amount.gt(0)
        ? {
            provider: "simulated",
            providerRefundId: `sim-refund-${input.bookingId}`,
            status: amount.gte(capturedAmount)
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED,
            refundedAt: new Date(),
          }
        : {
            provider: "simulated",
            providerRefundId: null,
            status: PaymentStatus.PAID,
            refundedAt: null,
          };

    this.refunds.set(input.bookingId, refundResult);
    return refundResult;
  }
}

export const payments: PaymentProvider = new SimulatedPaymentProvider();
