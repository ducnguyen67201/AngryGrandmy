import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type {
  PrepareDependencies,
  ValidationCheck,
} from "@/lib/fixes/prepare-repository-change";
import {
  getConfiguredRepository,
  type LocalRepository,
} from "@/lib/repository/local-repository";

const execFileAsync = promisify(execFile);

export const productionRepositoryChangeDependencies: PrepareDependencies = {
  getRepository: getConfiguredRepository,
  getTargetStatus,
  runAgent,
  getTargetDiff,
  runChecks,
};

async function getTargetStatus(repository: LocalRepository) {
  return git(repository, ["status", "--porcelain", "--", repository.relativeTarget]);
}

async function getTargetDiff(repository: LocalRepository) {
  const diff = await git(repository, [
    "diff",
    "--no-ext-diff",
    "--",
    repository.relativeTarget,
  ]);
  return diff.slice(0, 128 * 1024);
}

async function git(repository: LocalRepository, args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repository.gitRoot,
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 256 * 1024,
  });
  return stdout.trim();
}

async function runAgent(repository: LocalRepository, prompt: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "codex",
      [
        "exec",
        "--sandbox",
        "workspace-write",
        "--ephemeral",
        "--color",
        "never",
        "-c",
        "shell_environment_policy.inherit=none",
        "-C",
        repository.rootPath,
        "-",
      ],
      {
        cwd: repository.rootPath,
        shell: false,
        stdio: ["pipe", "ignore", "ignore"],
      },
    );
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("The coding agent timed out."));
    }, 180_000);
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("The coding agent is unavailable."));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error("The coding agent could not prepare the change."));
    });
    child.stdin.end(prompt);
  });
}

async function runChecks(repository: LocalRepository): Promise<ValidationCheck[]> {
  const packageJson = JSON.parse(
    await readFile(`${repository.rootPath}/package.json`, "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  const selected = ["test", "typecheck", "lint", "build"].filter(
    (script) => typeof scripts[script] === "string",
  );

  return Promise.all(selected.map(async (script) => {
    const command = `pnpm ${script}`;
    try {
      const { stdout, stderr } = await execFileAsync("pnpm", [script], {
        cwd: repository.rootPath,
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 256 * 1024,
      });
      return {
        command,
        passed: true,
        output: `${stdout}\n${stderr}`.trim().slice(-4_000),
      };
    } catch (error) {
      const output = error && typeof error === "object" && "stdout" in error
        ? String(error.stdout)
        : "Validation command failed.";
      return { command, passed: false, output: output.slice(-4_000) };
    }
  }));
}
