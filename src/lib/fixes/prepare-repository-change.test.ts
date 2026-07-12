import { describe, expect, it, vi } from "vitest";
import { prepareRepositoryChange } from "./prepare-repository-change";
import type { LocalRepository } from "@/lib/repository/local-repository";

const repository: LocalRepository = {
  id: "repo-123",
  name: "demo",
  rootPath: "/workspace/demo",
  gitRoot: "/workspace",
  relativeTarget: "demo",
  branch: "fix/usability",
  commitSha: "abcdef1234567",
};

const input = {
  repositoryId: repository.id,
  recommendation: "Explain why sensitive information is requested.",
  evidence: "The form asks for identity details without context.",
  proposal: "Add explanatory copy above the identity fields.",
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    getRepository: vi.fn().mockResolvedValue(repository),
    getTargetStatus: vi.fn().mockResolvedValue(""),
    runAgent: vi.fn().mockResolvedValue(undefined),
    getTargetDiff: vi.fn().mockResolvedValue("diff --git a/demo/app/page.tsx b/demo/app/page.tsx"),
    runChecks: vi.fn().mockResolvedValue([
      { command: "pnpm typecheck", passed: true, output: "Types passed." },
      { command: "pnpm build", passed: true, output: "Build passed." },
    ]),
    ...overrides,
  };
}

describe("prepareRepositoryChange", () => {
  it("creates a real diff in the configured target and marks it PR-ready after checks pass", async () => {
    const deps = dependencies();

    const result = await prepareRepositoryChange(input, deps);

    expect(deps.runAgent).toHaveBeenCalledWith(
      repository,
      expect.stringContaining(input.recommendation),
    );
    expect(result).toMatchObject({
      repository: { id: "repo-123", name: "demo", relativeTarget: "demo" },
      readyForPr: true,
      checks: [
        { command: "pnpm typecheck", passed: true },
        { command: "pnpm build", passed: true },
      ],
    });
    expect(result.diff).toContain("demo/app/page.tsx");
  });

  it("rejects a stale or substituted repository id", async () => {
    const deps = dependencies();

    await expect(
      prepareRepositoryChange({ ...input, repositoryId: "different-repo" }, deps),
    ).rejects.toThrow("Connected repository changed");
    expect(deps.runAgent).not.toHaveBeenCalled();
  });

  it("refuses to overwrite existing target changes", async () => {
    const deps = dependencies({
      getTargetStatus: vi.fn().mockResolvedValue(" M demo/app/page.tsx"),
    });

    await expect(prepareRepositoryChange(input, deps)).rejects.toThrow(
      "uncommitted changes",
    );
    expect(deps.runAgent).not.toHaveBeenCalled();
  });

  it("does not claim PR readiness when the agent produces no diff", async () => {
    const deps = dependencies({
      getTargetDiff: vi.fn().mockResolvedValue(""),
    });

    await expect(prepareRepositoryChange(input, deps)).rejects.toThrow(
      "did not produce a code change",
    );
  });
});
