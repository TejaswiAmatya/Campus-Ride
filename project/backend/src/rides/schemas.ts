import { z } from "zod";

const RideLocationSchema = z.object({
  address: z.string().min(1, "Address is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const RideStopSchema = z.object({
  address: z.string().min(1, "Stop address is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const recurrencePatternSchema = z.enum(["NONE", "DAILY", "WEEKLY", "SPECIFIC_DAYS"]);
const rideOfferTypeSchema = z.enum(["ONE_TIME", "RECURRING"]);

const OptionalRideLocationSchema = z.object({
  address: z.string().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const CreateRideSchema = z.object({
  offerType: rideOfferTypeSchema.default("ONE_TIME"),
  origin: RideLocationSchema,
  destination: RideLocationSchema,
  stops: z.array(RideStopSchema).max(8).optional().default([]),
  departureTime: z
    .string()
    .datetime({ message: "Must be a valid ISO 8601 datetime" }),
  totalSeats: z.number().int().min(1).max(8),
  pricePerSeat: z.number().min(0, "Price cannot be negative"),
  detourFlexibilityKm: z.number().min(0).max(100).optional().default(0),
  preferences: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  recurrencePattern: recurrencePatternSchema.optional().default("NONE"),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).max(7).optional().default([]),
  recurrenceEndDate: z.string().datetime().optional().nullable(),
  routePolyline: z.string().trim().min(1).optional().nullable(),
  routeDistanceKm: z.number().min(0).optional().nullable(),
  routeDurationMinutes: z.number().int().min(0).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.offerType === "RECURRING") {
    if (value.recurrencePattern === "NONE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring rides must choose a recurrence pattern",
        path: ["recurrencePattern"],
      });
    }

    if (
      value.recurrencePattern === "SPECIFIC_DAYS" &&
      (!value.recurrenceDays || value.recurrenceDays.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose at least one weekday for specific-day recurrence",
        path: ["recurrenceDays"],
      });
    }
  }
});

export const SearchRidesSchema = z
  .object({
    location: z.string().trim().min(1).optional(),
    origin: z.string().trim().min(1).optional(),
    dest: z.string().trim().min(1).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
    seats: z.coerce.number().int().min(1).max(8).optional(),
    originLat: z.coerce.number().min(-90).max(90).optional(),
    originLng: z.coerce.number().min(-180).max(180).optional(),
    destLat: z.coerce.number().min(-90).max(90).optional(),
    destLng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
    pickup: z.string().trim().min(1).optional(),
    dropoff: z.string().trim().min(1).optional(),
    pickupLat: z.coerce.number().min(-90).max(90).optional(),
    pickupLng: z.coerce.number().min(-180).max(180).optional(),
    dropoffLat: z.coerce.number().min(-90).max(90).optional(),
    dropoffLng: z.coerce.number().min(-180).max(180).optional(),
    earliestDepartureTime: z.string().datetime().optional(),
    latestDepartureTime: z.string().datetime().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    preferences: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((value) => {
        if (!value) return undefined;
        const raw = Array.isArray(value) ? value : value.split(",");
        const normalized = raw
          .map((item) => item.trim())
          .filter(Boolean);
        return normalized.length > 0 ? normalized : undefined;
      }),
    sortBy: z.enum(["bestMatch", "departureTime", "price", "rating"]).optional(),
  })
  .superRefine((value, ctx) => {
    const hasOriginLat = value.originLat !== undefined;
    const hasOriginLng = value.originLng !== undefined;
    const hasDestLat = value.destLat !== undefined;
    const hasDestLng = value.destLng !== undefined;
    const hasPickupLat = value.pickupLat !== undefined;
    const hasPickupLng = value.pickupLng !== undefined;
    const hasDropoffLat = value.dropoffLat !== undefined;
    const hasDropoffLng = value.dropoffLng !== undefined;

    if (hasOriginLat !== hasOriginLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "originLat and originLng must be provided together",
        path: hasOriginLat ? ["originLng"] : ["originLat"],
      });
    }

    if (hasDestLat !== hasDestLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "destLat and destLng must be provided together",
        path: hasDestLat ? ["destLng"] : ["destLat"],
      });
    }

    if (hasPickupLat !== hasPickupLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pickupLat and pickupLng must be provided together",
        path: hasPickupLat ? ["pickupLng"] : ["pickupLat"],
      });
    }

    if (hasDropoffLat !== hasDropoffLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dropoffLat and dropoffLng must be provided together",
        path: hasDropoffLat ? ["dropoffLng"] : ["dropoffLat"],
      });
    }

    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minPrice cannot be greater than maxPrice",
        path: ["maxPrice"],
      });
    }

    if (
      value.earliestDepartureTime &&
      value.latestDepartureTime &&
      new Date(value.earliestDepartureTime) > new Date(value.latestDepartureTime)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "earliestDepartureTime cannot be after latestDepartureTime",
        path: ["latestDepartureTime"],
      });
    }
  });

export const UpdateRideStatusSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
});

export const UpdateRideSchema = z.object({
  origin: OptionalRideLocationSchema.optional(),
  destination: OptionalRideLocationSchema.optional(),
  stops: z.array(RideStopSchema).max(8).optional(),
  departureTime: z.string().datetime().optional(),
  totalSeats: z.number().int().min(1).max(8).optional(),
  pricePerSeat: z.number().min(0).optional(),
  detourFlexibilityKm: z.number().min(0).max(100).optional(),
  preferences: z.array(z.string().trim().min(1)).max(20).optional(),
  routePolyline: z.string().trim().min(1).optional().nullable(),
  routeDistanceKm: z.number().min(0).optional().nullable(),
  routeDurationMinutes: z.number().int().min(0).optional().nullable(),
  updateMessage: z.string().trim().max(1000).optional(),
});

export const StartRideSchema = z.object({
  startedAt: z.string().datetime().optional(),
});

export const CreateRideReviewSchema = z.object({
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateRideInput = z.infer<typeof CreateRideSchema>;
export type SearchRidesInput = z.infer<typeof SearchRidesSchema>;
export type UpdateRideStatusInput = z.infer<typeof UpdateRideStatusSchema>;
export type UpdateRideInput = z.infer<typeof UpdateRideSchema>;
export type StartRideInput = z.infer<typeof StartRideSchema>;
export type CreateRideReviewInput = z.infer<typeof CreateRideReviewSchema>;
