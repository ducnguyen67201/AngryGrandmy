import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildNemoClawRegressionJob,
  queueNemoClawRegressionJob,
} from "./nemoclaw";

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

  it("durably queues a local job when no NemoClaw runtime is configured", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "grannysmith-nemoclaw-"));
    process.env.GRANNYSMITH_NEMOCLAW_JOB_FILE = path.join(directory, "jobs.json");
    try {
      const result = await queueNemoClawRegressionJob({
        calibrationId: "cal-1",
        targetUrl: "https://shop.example.com",
        objective: "Reach checkout review.",
        baselineRunId: "human-calibration:cal-1",
        candidateRunId: "run-after",
      });

      expect(result.mode).toBe("local-queue");
      expect(JSON.parse(await readFile(process.env.GRANNYSMITH_NEMOCLAW_JOB_FILE, "utf8"))).toHaveLength(1);
    } finally {
      delete process.env.GRANNYSMITH_NEMOCLAW_JOB_FILE;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
