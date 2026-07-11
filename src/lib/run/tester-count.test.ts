import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  DEFAULT_TESTER_COUNT,
  getTesterCountFromRequest,
  limitPersonasForTesterCount,
} from "./tester-count";

describe("tester count controls", () => {
  it("parses a bounded grandma spawn count from request payloads", () => {
    expect(getTesterCountFromRequest({ testerCount: 1 })).toBe(1);
    expect(getTesterCountFromRequest({ testerCount: 3 })).toBe(3);
    expect(getTesterCountFromRequest({ personaLimit: 2 })).toBe(2);
    expect(getTesterCountFromRequest({ testerCount: 99 })).toBe(DEFAULT_TESTER_COUNT);
    expect(getTesterCountFromRequest({ testerCount: "2" })).toBe(DEFAULT_TESTER_COUNT);
  });

  it("limits launched personas while preserving panel order", () => {
    const analysis = createDemoRun().analysis;
    expect(analysis).not.toBeNull();

    const personas = limitPersonasForTesterCount(analysis!, 2);

    expect(personas.map((persona) => persona.displayName)).toEqual(["Linda", "Rosa"]);
  });
});
