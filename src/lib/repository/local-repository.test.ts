import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getConfiguredRepository,
  getPublicRepositoryMetadata,
} from "./local-repository";

const originalPath = process.env.GRANNYSMITH_REPO_PATH;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalPath === undefined) delete process.env.GRANNYSMITH_REPO_PATH;
  else process.env.GRANNYSMITH_REPO_PATH = originalPath;
});

describe("local repository connection", () => {
  it("returns no connection when the repository path is not configured", async () => {
    vi.stubEnv("GRANNYSMITH_REPO_PATH", "");

    await expect(getConfiguredRepository()).resolves.toBeNull();
  });

  it("discovers a configured git repository without exposing its absolute path", async () => {
    vi.stubEnv("GRANNYSMITH_REPO_PATH", process.cwd());

    const repository = await getConfiguredRepository();
    expect(repository).toMatchObject({
      name: "ComputerUseHackathon",
      rootPath: process.cwd(),
    });
    expect(repository?.branch).toBeTruthy();
    expect(repository?.commitSha).toMatch(/^[a-f0-9]{7,40}$/);

    const metadata = getPublicRepositoryMetadata(repository!);
    expect(metadata).toEqual({
      id: repository?.id,
      name: "ComputerUseHackathon",
      branch: repository?.branch,
      commitSha: repository?.commitSha,
      relativeTarget: ".",
      mode: "read-only",
    });
    expect(metadata).not.toHaveProperty("rootPath");
  });

  it("rejects configured paths that are not directories", async () => {
    vi.stubEnv(
      "GRANNYSMITH_REPO_PATH",
      `${process.cwd()}/package.json`,
    );

    await expect(getConfiguredRepository()).rejects.toThrow(
      /repository path must be a directory/i,
    );
  });
});
