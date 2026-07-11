import { z } from "zod";

const RegressionInputSchema = z.object({
  calibrationId: z.string().min(1).max(120),
  targetUrl: z.string().url(),
  objective: z.string().min(1).max(500),
  baselineRunId: z.string().min(1).max(180),
  candidateRunId: z.string().min(1).max(180),
});

export type NemoClawRegressionInput = z.infer<typeof RegressionInputSchema>;

export function buildNemoClawRegressionJob(input: NemoClawRegressionInput) {
  const parsed = RegressionInputSchema.parse(input);
  const url = new URL(parsed.targetUrl);

  return {
    id: `nemoclaw-${parsed.calibrationId}-${parsed.candidateRunId}`.replace(
      /[^a-zA-Z0-9-]/g,
      "-",
    ),
    kind: "calibrated-usability-regression" as const,
    ...parsed,
    policy: {
      allowedHosts: [url.hostname],
      repositoryAccess: "read-only" as const,
      outputMode: "proposal-only" as const,
      forbiddenActions: [
        "submit_purchase",
        "submit_payment",
        "create_booking",
        "send_message",
        "enter_credentials",
        "write_repository",
        "commit",
        "push",
      ],
    },
    steps: [
      "Load the approved calibration profile and baseline evidence.",
      "Run the calibrated persona on the candidate build within the allowed host.",
      "Compare only observable friction types, completion, recovery, and step evidence.",
      "Prepare a proposal-only fix brief for new regressions.",
      "Report before and after evidence without modifying the repository.",
    ],
    createdAt: new Date().toISOString(),
  };
}
