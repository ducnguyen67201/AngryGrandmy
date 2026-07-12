import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("isolated demo dev server", () => {
  it("uses webpack on port 3001 to avoid Turbopack RSC manifest flakiness", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), "demo/package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.dev).toContain("--webpack");
    expect(packageJson.scripts?.dev).not.toContain("--turbopack");
    expect(packageJson.scripts?.dev).toContain("-p 3001");
  });
});
