import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { buildPanelReviewItems } from "./panel-review";

describe("panel review items", () => {
  it("marks generated personas as launching or standby based on tester count", () => {
    const analysis = createDemoRun().analysis;
    expect(analysis).not.toBeNull();

    const items = buildPanelReviewItems({
      analysis: analysis!,
      testerCount: 2,
      selectedPersonaId: "mei",
    });

    expect(items).toHaveLength(4);
    expect(items.map((item) => item.displayName)).toEqual(["Linda", "Rosa", "Mei", "Joan"]);
    expect(items.map((item) => item.launchState)).toEqual([
      "launching",
      "launching",
      "standby",
      "standby",
    ]);
    expect(items[2].selected).toBe(true);
    expect(items[0].task).toContain("routine doctor");
  });
});
