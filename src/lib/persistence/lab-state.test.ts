import { describe, expect, it, vi } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  buildLabSearchParams,
  buildPersistedLabState,
  clearPersistedLabState,
  parseLabSearchParams,
  parsePersistedLabState,
  PERSISTED_LAB_STATE_VERSION,
  shouldRestorePersistedRun,
} from "./lab-state";

describe("lab state persistence", () => {
  it("round-trips a validated lab run without secrets", () => {
    const snapshot = {
      ...createDemoRun(),
      phase: "running" as const,
    };

    const persisted = buildPersistedLabState({
      snapshot,
      targetUrl: "https://gettrustloop.app/",
      objective: "Find the primary user workflow.",
      selectedPresetId: null,
      testerCount: 2,
      authorized: true,
      statusLine: "Polling H Company sessions.",
    });

    expect(persisted.version).toBe(PERSISTED_LAB_STATE_VERSION);
    expect(JSON.stringify(persisted)).not.toContain("API_KEY");
    expect(JSON.stringify(persisted)).not.toContain("hk-");

    const parsed = parsePersistedLabState(JSON.stringify(persisted));
    expect(parsed?.snapshot.phase).toBe("running");
    expect(parsed?.targetUrl).toBe("https://gettrustloop.app/");
    expect(parsed?.testerCount).toBe(2);
    expect(parsed?.statusLine).toBe("Polling H Company sessions.");
  });

  it("rejects corrupted or obsolete saved state", () => {
    expect(parsePersistedLabState("not json")).toBeNull();
    expect(parsePersistedLabState(JSON.stringify({ version: 0 }))).toBeNull();
    expect(
      parsePersistedLabState(
        JSON.stringify({
          version: PERSISTED_LAB_STATE_VERSION,
          snapshot: { id: "" },
        }),
      ),
    ).toBeNull();
  });

  it("round-trips a shareable lab configuration through URL parameters", () => {
    const search = buildLabSearchParams({
      targetUrl: "https://example.com/checkout?currency=usd",
      objective: "Reach order review without placing the order.",
      testerCount: 3,
    });

    expect(parseLabSearchParams(search)).toEqual({
      targetUrl: "https://example.com/checkout?currency=usd",
      objective: "Reach order review without placing the order.",
      testerCount: 3,
    });
  });

  it("ignores unsafe or out-of-range URL configuration", () => {
    expect(
      parseLabSearchParams(
        "?url=javascript%3Aalert(1)&objective=%20%20&testers=9",
      ),
    ).toEqual({});
  });

  it("restores dispatched sessions when the share URL still matches the saved run", () => {
    const persisted = buildPersistedLabState({
      snapshot: { ...createDemoRun(), phase: "running" },
      targetUrl: "https://gettrustloop.app/",
      objective: "Find the primary workflow.",
      selectedPresetId: null,
      testerCount: 2,
      authorized: true,
      statusLine: "Two H sessions running.",
    });

    expect(
      shouldRestorePersistedRun(
        persisted,
        parseLabSearchParams(
          buildLabSearchParams({
            targetUrl: persisted.targetUrl,
            objective: persisted.objective,
            testerCount: 2,
          }),
        ),
      ),
    ).toBe(true);
    expect(persisted.snapshot.sessions.length).toBeGreaterThan(0);
  });

  it("starts a new configuration when the URL differs from the saved run", () => {
    const persisted = buildPersistedLabState({
      snapshot: { ...createDemoRun(), phase: "running" },
      targetUrl: "https://gettrustloop.app/",
      objective: "Find the primary workflow.",
      selectedPresetId: null,
      testerCount: 2,
      authorized: true,
      statusLine: "Two H sessions running.",
    });

    expect(
      shouldRestorePersistedRun(persisted, {
        targetUrl: "https://another-product.example/",
        objective: persisted.objective,
        testerCount: 2,
      }),
    ).toBe(false);
  });

  it("saves explicit persona acceptance with the generated roster", () => {
    const persisted = buildPersistedLabState({
      snapshot: { ...createDemoRun(), phase: "revealing" },
      targetUrl: "https://gettrustloop.app/",
      objective: "Find the primary workflow.",
      selectedPresetId: null,
      testerCount: 2,
      authorized: true,
      personasAccepted: true,
      statusLine: "Persona suggestions accepted and saved.",
    });

    expect(
      parsePersistedLabState(JSON.stringify(persisted))?.personasAccepted,
    ).toBe(true);
    expect(persisted.snapshot.analysis?.personas).toHaveLength(4);
  });

  it("explicitly removes the saved run when starting a new test", () => {
    const removeItem = vi.fn();

    clearPersistedLabState({ removeItem });

    expect(removeItem).toHaveBeenCalledWith(PERSISTED_LAB_STATE_KEY);
  });
});
