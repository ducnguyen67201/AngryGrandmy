import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareRepositoryChange } from "@/lib/fixes/prepare-repository-change";
import { POST } from "./route";

vi.mock("@/lib/fixes/prepare-repository-change", () => ({
  prepareRepositoryChange: vi.fn(),
}));

const validBody = {
  repositoryId: "0123456789abcdef",
  recommendation: "Explain why sensitive information is requested.",
  evidence: "The form asks for identity details without context.",
  proposal: "Add explanatory copy above the identity fields.",
};

describe("POST /api/improvements/prepare", () => {
  beforeEach(() => vi.mocked(prepareRepositoryChange).mockReset());

  it("returns a validated local diff without publishing it", async () => {
    vi.mocked(prepareRepositoryChange).mockResolvedValue({
      repository: {
        id: validBody.repositoryId,
        name: "demo",
        branch: "fix/usability",
        commitSha: "abcdef1",
        relativeTarget: "demo",
        mode: "read-only",
      },
      diff: "diff --git a/demo/app/page.tsx b/demo/app/page.tsx",
      checks: [{ command: "pnpm build", passed: true, output: "passed" }],
      readyForPr: true,
    });

    const response = await POST(new NextRequest(
      "http://localhost/api/improvements/prepare",
      { method: "POST", body: JSON.stringify(validBody) },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { readyForPr: true },
      meta: { published: false },
    });
  });

  it("rejects oversized or malformed preparation requests", async () => {
    const response = await POST(new NextRequest(
      "http://localhost/api/improvements/prepare",
      { method: "POST", body: JSON.stringify({ ...validBody, proposal: "" }) },
    ));

    expect(response.status).toBe(422);
    expect(prepareRepositoryChange).not.toHaveBeenCalled();
  });
});
