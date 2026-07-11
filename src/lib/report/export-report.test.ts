import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  buildJudgeSummary,
  buildMarkdownReport,
  buildReportJson,
} from "./export-report";

describe("report export helpers", () => {
  it("builds judge-ready summary, markdown, and json exports", () => {
    const snapshot = createDemoRun();

    expect(buildJudgeSummary(snapshot)).toContain("Mission Street Health");
    expect(buildJudgeSummary(snapshot)).toContain("/100");

    const markdown = buildMarkdownReport(snapshot);
    expect(markdown).toContain("# GrannySmith Report");
    expect(markdown).toContain("## Persona Results");
    expect(markdown).toContain("## Disclosure");

    const json = JSON.parse(buildReportJson(snapshot)) as {
      judgeSummary?: string;
      report?: { score?: number };
    };
    expect(json.judgeSummary).toContain("Mission Street Health");
    expect(json.report?.score).toBe(snapshot.report?.score);
  });
});
