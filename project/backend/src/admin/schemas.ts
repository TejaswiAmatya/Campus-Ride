import { z } from "zod";

export const DriverDecisionSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(500).optional(), // required when approved = false
});

export const UpdateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const ResolveReportSchema = z.object({
  resolution: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  note: z.string().max(1000).optional(),
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
