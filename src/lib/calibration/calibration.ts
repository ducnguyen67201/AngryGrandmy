import { z } from "zod";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const CalibrationEvidenceTypeSchema = z.enum([
  "hesitation",
  "backtrack",
  "misclick",
  "trust_concern",
  "recovery",
  "success",
]);

export const CalibrationEvidenceSchema = z
  .object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    type: CalibrationEvidenceTypeSchema,
    observation: z.string().trim().min(1).max(600),
    transcript: z.string().trim().min(1).max(600).optional(),
    confidence: z.number().min(0).max(1),
  })
  .refine((value) => value.endMs >= value.startMs, {
    message: "Evidence end time must not precede its start time.",
    path: ["endMs"],
  });

export const CalibrationMediaSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  mimeType: z.enum(["video/webm", "video/mp4"]),
  byteLength: z.number().int().positive().max(25 * 1024 * 1024),
});

export const CalibrationSessionSchema = z
  .object({
    id: z.string().min(1).max(120),
    testerName: z.string().trim().min(1).max(60),
    targetUrl: z.string().url(),
    objective: z.string().trim().min(1).max(500),
    consentedAt: z.string().datetime(),
    status: z.enum([
      "processing",
      "needs_review",
      "approved",
      "rejected",
      "failed",
    ]),
    source: z.enum(["nvidia-vss", "nvidia", "heuristic"]),
    transcript: z.string().max(20_000).nullable(),
    media: CalibrationMediaSchema.nullable(),
    evidence: z.array(CalibrationEvidenceSchema).max(100),
    behaviorRules: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
    trustBoundaries: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
    approvedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((value, context) => {
    if (value.status === "approved" && !value.approvedAt) {
      context.addIssue({
        code: "custom",
        message: "Approved calibrations require an approval timestamp.",
        path: ["approvedAt"],
      });
    }
  });

export const CalibrationSubmissionSchema = z.object({
  testerName: z.string().trim().min(1).max(60),
  targetUrl: z.string().url(),
  objective: z.string().trim().min(1).max(500),
  consentConfirmed: z.literal(true),
  researchUseConfirmed: z.literal(true),
  observationNotes: z.string().trim().min(12).max(4000),
});

export const CalibrationApprovalSchema = z.object({
  behaviorRules: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  trustBoundaries: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  approved: z.boolean(),
});

export function validateCalibrationSubmission(input: unknown) {
  const parsed = CalibrationSubmissionSchema.parse(input);
  validateAnalyzeRequest({
    url: parsed.targetUrl,
    objective: parsed.objective,
    authorizationConfirmed: true,
  });
  return parsed;
}

export type CalibrationEvidenceType = z.infer<
  typeof CalibrationEvidenceTypeSchema
>;
export type CalibrationEvidence = z.infer<typeof CalibrationEvidenceSchema>;
export type CalibrationSession = z.infer<typeof CalibrationSessionSchema>;
export type CalibrationSubmission = z.infer<typeof CalibrationSubmissionSchema>;
export type CalibrationApproval = z.infer<typeof CalibrationApprovalSchema>;
