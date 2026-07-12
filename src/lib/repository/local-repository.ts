import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LocalRepository = {
  id: string;
  name: string;
  rootPath: string;
  gitRoot: string;
  relativeTarget: string;
  branch: string;
  commitSha: string;
};

export type PublicRepositoryMetadata = Omit<
  LocalRepository,
  "rootPath" | "gitRoot"
> & {
  mode: "read-only";
};

export async function getConfiguredRepository(): Promise<LocalRepository | null> {
  const configuredPath = process.env.GRANNYSMITH_REPO_PATH?.trim();
  if (!configuredPath) return null;

  const rootPath = await realpath(path.resolve(configuredPath));
  const details = await stat(rootPath);
  if (!details.isDirectory()) {
    throw new Error("Configured repository path must be a directory.");
  }

  const gitRoot = await git(rootPath, ["rev-parse", "--show-toplevel"]);
  const relativeTarget = path.relative(gitRoot, rootPath) || ".";
  if (relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`)) {
    throw new Error("Configured repository target must be inside its Git root.");
  }

  const [branch, commitSha] = await Promise.all([
    git(gitRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    git(gitRoot, ["rev-parse", "HEAD"]),
  ]);

  return {
    id: createHash("sha256").update(rootPath).digest("hex").slice(0, 16),
    name: path.basename(rootPath),
    rootPath,
    gitRoot,
    relativeTarget,
    branch,
    commitSha,
  };
}

export function getPublicRepositoryMetadata(
  repository: LocalRepository,
): PublicRepositoryMetadata {
  return {
    id: repository.id,
    name: repository.name,
    branch: repository.branch,
    commitSha: repository.commitSha,
    relativeTarget: repository.relativeTarget,
    mode: "read-only",
  };
}

async function git(cwd: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 64 * 1024,
    });
    return stdout.trim();
  } catch {
    throw new Error("Configured repository path must belong to a readable Git repository.");
  }
}
