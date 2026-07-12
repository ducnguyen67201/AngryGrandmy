import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  summarizeTrainingCollection,
  TrainingEpisodeSchema,
  type TrainingEpisode,
} from "./training-episode";

const DEFAULT_DATASET_FILE = ".grannysmith/training-episodes.json";
let writeQueue = Promise.resolve();

export type SaveTrainingEpisodesResult = {
  savedCount: number;
  totalCount: number;
  summary: ReturnType<typeof summarizeTrainingCollection>;
};

function datasetFile() {
  return path.resolve(
    process.env.GRANNYSMITH_TRAINING_DATASET_FILE ?? DEFAULT_DATASET_FILE,
  );
}

export async function listTrainingEpisodes(): Promise<TrainingEpisode[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(datasetFile(), "utf8"));
    const records = TrainingEpisodeSchema.array().parse(parsed);
    return records.sort((left, right) =>
      right.collectedAt.localeCompare(left.collectedAt),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function saveTrainingEpisodes(
  episodes: readonly TrainingEpisode[],
): Promise<SaveTrainingEpisodesResult> {
  return serialized(async () => {
    const incoming = episodes.map((episode) => TrainingEpisodeSchema.parse(episode));
    const existing = await listTrainingEpisodes();
    const byId = new Map(existing.map((episode) => [episode.id, episode]));
    let savedCount = 0;

    for (const episode of incoming) {
      if (!byId.has(episode.id)) savedCount += 1;
      byId.set(episode.id, episode);
    }

    const records = [...byId.values()].sort((left, right) =>
      right.collectedAt.localeCompare(left.collectedAt),
    );
    await writeAll(records);

    return {
      savedCount,
      totalCount: records.length,
      summary: summarizeTrainingCollection(records),
    };
  });
}

async function writeAll(records: readonly TrainingEpisode[]) {
  const target = datasetFile();
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(records, null, 2), {
    mode: 0o600,
  });
  await rename(temporary, target);
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
