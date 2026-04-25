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

export interface PaymentProvider {
  capture(input: CapturePaymentInput): Promise<CapturePaymentResult>;
}

class SimulatedPaymentProvider implements PaymentProvider {
  private captures = new Map<string, CapturePaymentResult>();

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

    this.captures.set(input.bookingId, captureResult);
    return captureResult;
  }
}

export const payments: PaymentProvider = new SimulatedPaymentProvider();
