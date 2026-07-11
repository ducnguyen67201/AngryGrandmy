import { z } from "zod";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

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

export async function queueNemoClawRegressionJob(
  input: NemoClawRegressionInput,
) {
  const job = buildNemoClawRegressionJob(input);
  if (process.env.NEMOCLAW_URL) {
    const endpoint = new URL(process.env.NEMOCLAW_URL);
    if (!['http:', 'https:'].includes(endpoint.protocol)) {
      throw new Error("NEMOCLAW_URL must use HTTP or HTTPS.");
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEMOCLAW_TOKEN
          ? { Authorization: `Bearer ${process.env.NEMOCLAW_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(job),
    });
    if (!response.ok) throw new Error("NemoClaw rejected the regression job.");
    return { mode: "nemoclaw" as const, job };
  }

  const file = path.resolve(
    process.env.GRANNYSMITH_NEMOCLAW_JOB_FILE ??
      ".grannysmith/nemoclaw-jobs.json",
  );
  let jobs: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (Array.isArray(parsed)) jobs = parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!jobs.some((candidate) => isSameJob(candidate, job.id))) jobs.push(job);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(jobs, null, 2), { mode: 0o600 });
  await rename(temporary, file);
  return { mode: "local-queue" as const, job };
}

function isSameJob(value: unknown, id: string) {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    (value as { id?: unknown }).id === id
  );
}
