import { z } from "zod";
import { ALLOWED_CONFIG_KEYS, PLATFORM_FEE_CONFIG_KEY } from "../config/service";

export const DriverDecisionSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(500).optional(), // required when approved = false
}).superRefine((data, ctx) => {
  if (!data.approved && (!data.reason || data.reason.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "Reason is required when rejecting a driver application",
    });
  }
});

export const UpdateConfigSchema = z.object({
  key: z.enum(ALLOWED_CONFIG_KEYS),
  value: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.key !== PLATFORM_FEE_CONFIG_KEY) {
    return;
  }

  const parsed = Number(data.value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "platformFeePercent must be a number between 0 and 100",
    });
  }
});

export const ResolveReportSchema = z.object({
  resolution: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  note: z.string().max(1000).optional(),
});

export const CreateModerationActionSchema = z.object({
  actionType: z.enum(["WARNING", "SUSPENSION", "BAN", "UNBAN"]),
  reason: z.string().trim().min(3).max(1000),
  note: z.string().trim().max(1000).optional(),
  reportId: z.string().uuid().optional(),
  suspendedUntil: z.string().datetime().optional(),
});

export const CreateReportSchema = z.object({
  targetUserId: z.string().uuid(),
  targetRideId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export type DriverDecisionInput = z.infer<typeof DriverDecisionSchema>;
export type UpdateConfigInput = z.infer<typeof UpdateConfigSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type CreateModerationActionInput = z.infer<
  typeof CreateModerationActionSchema
>;
