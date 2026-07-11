import { z } from "zod";
import {
  DEFAULT_TESTER_COUNT,
  isTesterCount,
  type TesterCount,
} from "@/lib/run/tester-count";
import { RunSnapshotSchema, type RunSnapshot } from "@/lib/schemas/run";

export const PERSISTED_LAB_STATE_KEY = "grannysmith:last-lab-state";
export const PERSISTED_LAB_STATE_VERSION = 1;

const PersistedLabStateSchema = z.object({
  version: z.literal(PERSISTED_LAB_STATE_VERSION),
  snapshot: RunSnapshotSchema,
  targetUrl: z.string().url(),
  objective: z.string(),
  selectedPresetId: z.string().nullable(),
  testerCount: z.number().int().min(1).max(4).default(DEFAULT_TESTER_COUNT),
  authorized: z.boolean(),
  statusLine: z.string(),
  savedAt: z.string().datetime(),
});

export type PersistedLabState = z.infer<typeof PersistedLabStateSchema>;

export type LabSearchState = {
  targetUrl?: string;
  objective?: string;
  testerCount?: TesterCount;
};

const HttpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
});

export function parseLabSearchParams(search: string): LabSearchState {
  const params = new URLSearchParams(search);
  const targetUrl = HttpUrlSchema.safeParse(params.get("url"));
  const objective = z
    .string()
    .trim()
    .min(1)
    .max(500)
    .safeParse(params.get("objective"));
  const requestedCount = Number(params.get("testers"));

  return {
    ...(targetUrl.success ? { targetUrl: targetUrl.data } : {}),
    ...(objective.success ? { objective: objective.data } : {}),
    ...(isTesterCount(requestedCount) ? { testerCount: requestedCount } : {}),
  };
}

export function buildLabSearchParams({
  targetUrl,
  objective,
  testerCount,
}: {
  targetUrl: string;
  objective: string;
  testerCount: TesterCount;
}): string {
  const params = new URLSearchParams({
    url: HttpUrlSchema.parse(targetUrl),
    objective: z.string().trim().min(1).max(500).parse(objective),
    testers: String(testerCount),
  });
  return `?${params.toString()}`;
}

export function buildPersistedLabState({
  snapshot,
  targetUrl,
  objective,
  selectedPresetId,
  testerCount,
  authorized,
  statusLine,
}: {
  snapshot: RunSnapshot;
  targetUrl: string;
  objective: string;
  selectedPresetId: string | null;
  testerCount: number;
  authorized: boolean;
  statusLine: string;
}): PersistedLabState {
  return PersistedLabStateSchema.parse({
    version: PERSISTED_LAB_STATE_VERSION,
    snapshot,
    targetUrl,
    objective,
    selectedPresetId,
    testerCount,
    authorized,
    statusLine,
    savedAt: new Date().toISOString(),
  });
}

export function parsePersistedLabState(value: string | null): PersistedLabState | null {
  if (!value) return null;

  try {
    return PersistedLabStateSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
