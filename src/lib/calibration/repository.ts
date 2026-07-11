import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CalibrationMediaSchema,
  CalibrationSessionSchema,
  type CalibrationSession,
} from "./calibration";

const DEFAULT_RECORD_FILE = ".grannysmith/calibrations.json";
const DEFAULT_MEDIA_DIR = ".grannysmith/calibration-media";
const SAFE_ID = /^[a-zA-Z0-9-]{1,120}$/;
let writeQueue = Promise.resolve();

function recordFile() {
  return path.resolve(
    process.env.GRANNYSMITH_CALIBRATION_FILE ?? DEFAULT_RECORD_FILE,
  );
}

function mediaDirectory() {
  return path.resolve(
    process.env.GRANNYSMITH_CALIBRATION_MEDIA_DIR ?? DEFAULT_MEDIA_DIR,
  );
}

function assertSafeId(id: string) {
  if (!SAFE_ID.test(id)) throw new Error("Invalid calibration id.");
}

async function readAll(): Promise<CalibrationSession[]> {
  try {
    const raw = JSON.parse(await readFile(recordFile(), "utf8"));
    return CalibrationSessionSchema.array().parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeAll(records: CalibrationSession[]) {
  const target = recordFile();
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

export async function getCalibration(id: string) {
  assertSafeId(id);
  return (await readAll()).find((record) => record.id === id) ?? null;
}

export function saveCalibration(session: CalibrationSession) {
  return serialized(async () => {
    const parsed = CalibrationSessionSchema.parse(session);
    const records = await readAll();
    const index = records.findIndex((record) => record.id === parsed.id);
    if (index >= 0) records[index] = parsed;
    else records.push(parsed);
    await writeAll(records);
    return parsed;
  });
}

export function updateCalibration(
  id: string,
  update: (current: CalibrationSession) => CalibrationSession,
) {
  assertSafeId(id);
  return serialized(async () => {
    const records = await readAll();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("Calibration not found.");
    const next = CalibrationSessionSchema.parse(update(records[index]));
    records[index] = next;
    await writeAll(records);
    return next;
  });
}

export async function saveCalibrationMedia(input: {
  calibrationId: string;
  bytes: Buffer;
  mimeType: "video/webm" | "video/mp4";
}) {
  assertSafeId(input.calibrationId);
  const extension = input.mimeType === "video/mp4" ? "mp4" : "webm";
  const media = CalibrationMediaSchema.parse({
    filename: `${input.calibrationId}.${extension}`,
    mimeType: input.mimeType,
    byteLength: input.bytes.byteLength,
  });
  const directory = mediaDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(directory, media.filename), input.bytes, {
    mode: 0o600,
  });
  return media;
}
