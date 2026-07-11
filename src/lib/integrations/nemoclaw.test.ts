import { describe, expect, it } from "vitest";
import { buildNemoClawRegressionJob } from "./nemoclaw";

describe("buildNemoClawRegressionJob", () => {
  it("creates a proposal-only, domain-scoped regression job", () => {
    const job = buildNemoClawRegressionJob({
      calibrationId: "cal-1",
      targetUrl: "https://shop.example.com/checkout",
      objective: "Reach checkout review.",
      baselineRunId: "run-before",
      candidateRunId: "run-after",
    });

    expect(job.policy.allowedHosts).toEqual(["shop.example.com"]);
    expect(job.policy.repositoryAccess).toBe("read-only");
    expect(job.policy.outputMode).toBe("proposal-only");
    expect(job.policy.forbiddenActions).toContain("submit_purchase");
    expect(job.steps.at(-1)).toMatch(/before.*after/i);
  });
});
