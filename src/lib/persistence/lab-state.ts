import { z } from "zod";
import { DEFAULT_TESTER_COUNT } from "@/lib/run/tester-count";
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
