import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { buildTrainingEpisodes } from "./training-episode";
import {
  listTrainingEpisodes,
  saveTrainingEpisodes,
} from "./repository";

let directory = "";

describe("training dataset repository", () => {
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "grannysmith-training-"));
    process.env.GRANNYSMITH_TRAINING_DATASET_FILE = path.join(
      directory,
      "episodes.json",
    );
  });

  afterEach(async () => {
    delete process.env.GRANNYSMITH_TRAINING_DATASET_FILE;
    await rm(directory, { recursive: true, force: true });
  });

  it("persists episodes idempotently", async () => {
    const episodes = buildTrainingEpisodes({
      snapshot: createDemoRun(),
      events: [],
    });

    const first = await saveTrainingEpisodes(episodes);
    const second = await saveTrainingEpisodes(episodes);

    expect(first.savedCount).toBe(episodes.length);
    expect(second.savedCount).toBe(0);
    expect(second.totalCount).toBe(episodes.length);
    await expect(listTrainingEpisodes()).resolves.toHaveLength(episodes.length);
  });
});
