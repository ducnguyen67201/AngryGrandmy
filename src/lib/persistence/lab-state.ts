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
  personasAccepted: z.boolean().default(false),
  statusLine: z.string(),
  savedAt: z.string().datetime(),
});

export type PersistedLabState = z.infer<typeof PersistedLabStateSchema>;

export type LabSearchState = {
  targetUrl?: string;
  objective?: string;
  testerCount?: TesterCount;
  realRun?: boolean;
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
  const realRun =
    params.get("run") === "1" ||
    params.get("live") === "1";

  return {
    ...(targetUrl.success ? { targetUrl: targetUrl.data } : {}),
    ...(objective.success ? { objective: objective.data } : {}),
    ...(isTesterCount(requestedCount) ? { testerCount: requestedCount } : {}),
    ...(realRun ? { realRun } : {}),
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

export function shouldRestorePersistedRun(
  persisted: PersistedLabState,
  query: LabSearchState,
): boolean {
  if (query.realRun) return false;
  if (
    query.targetUrl &&
    new URL(query.targetUrl).href !== new URL(persisted.targetUrl).href
  ) {
    return false;
  }
  if (query.objective && query.objective.trim() !== persisted.objective.trim()) {
    return false;
  }
  if (query.testerCount && query.testerCount !== persisted.testerCount) {
    return false;
  }
  return true;
}

export function buildPersistedLabState({
  snapshot,
  targetUrl,
  objective,
  selectedPresetId,
  testerCount,
  authorized,
  personasAccepted = false,
  statusLine,
}: {
  snapshot: RunSnapshot;
  targetUrl: string;
  objective: string;
  selectedPresetId: string | null;
  testerCount: number;
  authorized: boolean;
  personasAccepted?: boolean;
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
    personasAccepted,
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

export function clearPersistedLabState(
  storage: Pick<Storage, "removeItem">,
): void {
  storage.removeItem(PERSISTED_LAB_STATE_KEY);
}
