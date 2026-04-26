export type EmailJobType =
  | "welcome"
  | "booking-confirmed"
  | "ride-updated"
  | "ride-started"
  | "booking-cancelled"
  | "driver-approved"
  | "driver-rejected"
  | "academic-approved"
  | "academic-rejected";

type BaseEmailPayload = {
  to: string;
};

export type WelcomeEmailPayload = BaseEmailPayload & {
  type: "welcome";
  userName: string;
};

export type BookingConfirmedEmailPayload = BaseEmailPayload & {
  type: "booking-confirmed";
  passengerName: string;
  rideDate: string;
  driverName: string;
  price: string;
};

export type RideStartedEmailPayload = BaseEmailPayload & {
  type: "ride-started";
  passengerName: string;
  rideDate: string;
  driverName: string;
};

export type RideUpdatedEmailPayload = BaseEmailPayload & {
  type: "ride-updated";
  passengerName: string;
  rideDate: string;
  driverName: string;
  originAddress: string;
  destinationAddress: string;
  updateMessage?: string;
};

export type BookingCancelledEmailPayload = BaseEmailPayload & {
  type: "booking-cancelled";
  passengerName: string;
  rideDate: string;
  driverName: string;
};

export type DriverApprovedEmailPayload = BaseEmailPayload & {
  type: "driver-approved";
  userName: string;
};

export type DriverRejectedEmailPayload = BaseEmailPayload & {
  type: "driver-rejected";
  userName: string;
  reason?: string;
};

export type AcademicApprovedEmailPayload = BaseEmailPayload & {
  type: "academic-approved";
  userName: string;
};

export type AcademicRejectedEmailPayload = BaseEmailPayload & {
  type: "academic-rejected";
  userName: string;
  reason?: string;
};

export type EmailJobPayload =
  | WelcomeEmailPayload
  | BookingConfirmedEmailPayload
  | RideUpdatedEmailPayload
  | RideStartedEmailPayload
  | BookingCancelledEmailPayload
  | DriverApprovedEmailPayload
  | DriverRejectedEmailPayload
  | AcademicApprovedEmailPayload
  | AcademicRejectedEmailPayload;

type BuiltEmail = {
  subject: string;
  html: string;
};

function wrapHtml(title: string, content: string) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; padding:32px; border:1px solid #e5e7eb;">
        <h1 style="margin:0 0 16px; font-size:24px; color:#111827;">${title}</h1>
        <div style="font-size:16px; line-height:1.6; color:#374151;">
          ${content}
        </div>
        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />
        <p style="margin:0; font-size:14px; color:#6b7280;">
          Campus Ride
        </p>
      </div>
    </div>
  `;
}

export function buildEmail(payload: EmailJobPayload): BuiltEmail {
  switch (payload.type) {
    case "welcome":
      return {
        subject: "Welcome to Campus Ride",
        html: wrapHtml(
          "Welcome to Campus Ride",
          `
            <p>Hi ${payload.userName},</p>
            <p>Your account has been created successfully.</p>
            <p>You can now complete your profile, search for rides, or apply to become a driver.</p>
          `,
        ),
      };

    case "booking-confirmed":
      return {
        subject: "Your booking is confirmed",
        html: wrapHtml(
          "Booking Confirmed",
          `
            <p>Hi ${payload.passengerName},</p>
            <p>Your booking has been confirmed.</p>
            <p><strong>Ride date:</strong> ${payload.rideDate}</p>
            <p><strong>Driver:</strong> ${payload.driverName}</p>
            <p><strong>Price:</strong> ${payload.price}</p>
          `,
        ),
      };

    case "ride-started":
      return {
        subject: "Your ride has started",
        html: wrapHtml(
          "Ride Started",
          `
            <p>Hi ${payload.passengerName},</p>
            <p>Your ride has now started.</p>
            <p><strong>Ride date:</strong> ${payload.rideDate}</p>
            <p><strong>Driver:</strong> ${payload.driverName}</p>
          `,
        ),
      };

    case "ride-updated":
      return {
        subject: "Your ride details were updated",
        html: wrapHtml(
          "Ride Updated",
          `
            <p>Hi ${payload.passengerName},</p>
            <p>Your driver updated the details for your upcoming ride.</p>
            <p><strong>Route:</strong> ${payload.originAddress} to ${payload.destinationAddress}</p>
            <p><strong>Ride date:</strong> ${payload.rideDate}</p>
            <p><strong>Driver:</strong> ${payload.driverName}</p>
            ${
              payload.updateMessage
                ? `<p><strong>Driver note:</strong> ${payload.updateMessage}</p>`
                : ""
            }
            <p>Please review the latest ride details in Campus Ride.</p>
          `,
        ),
      };

    case "booking-cancelled":
      return {
        subject: "Your booking was cancelled",
        html: wrapHtml(
          "Booking Cancelled",
          `
            <p>Hi ${payload.passengerName},</p>
            <p>Your booking has been cancelled.</p>
            <p><strong>Ride date:</strong> ${payload.rideDate}</p>
            <p><strong>Driver:</strong> ${payload.driverName}</p>
          `,
        ),
      };

    case "driver-approved":
      return {
        subject: "Your driver application was approved",
        html: wrapHtml(
          "Driver Application Approved",
          `
            <p>Hi ${payload.userName},</p>
            <p>Your driver application has been approved.</p>
            <p>You can now create rides in Campus Ride.</p>
          `,
        ),
      };

    case "driver-rejected":
      return {
        subject: "Your driver application was rejected",
        html: wrapHtml(
          "Driver Application Rejected",
          `
            <p>Hi ${payload.userName},</p>
            <p>Your driver application was not approved at this time.</p>
            ${
              payload.reason
                ? `<p><strong>Reason:</strong> ${payload.reason}</p>`
                : ""
            }
            <p>You can review your information and apply again later if needed.</p>
          `,
        ),
      };

    case "academic-approved":
      return {
        subject: "Your academic verification was approved",
        html: wrapHtml(
          "Academic Verification Approved",
          `
            <p>Hi ${payload.userName},</p>
            <p>Your academic verification has been approved.</p>
            <p>Your verified student or staff badge is now visible on your profile.</p>
          `,
        ),
      };

    case "academic-rejected":
      return {
        subject: "Your academic verification was rejected",
        html: wrapHtml(
          "Academic Verification Rejected",
          `
            <p>Hi ${payload.userName},</p>
            <p>Your academic verification was not approved at this time.</p>
            ${
              payload.reason
                ? `<p><strong>Reason:</strong> ${payload.reason}</p>`
                : ""
            }
            <p>You can review your document and submit it again from your profile.</p>
          `,
        ),
      };

    default: {
      const neverPayload: never = payload;
      throw new Error(
        `Unsupported email payload: ${JSON.stringify(neverPayload)}`,
      );
    }
  }
}
