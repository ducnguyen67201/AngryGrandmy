import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import {
  CalibrationSessionSchema,
  validateCalibrationSubmission,
} from "@/lib/calibration/calibration";
import {
  saveCalibration,
  saveCalibrationMedia,
} from "@/lib/calibration/repository";
import { analyzeCalibration } from "@/lib/integrations/nvidia-calibration";

export const runtime = "nodejs";
export const maxDuration = 120;
const ALLOWED_MEDIA = new Set(["video/webm", "video/mp4"]);
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const submission = validateCalibrationSubmission({
      testerName: readText(form, "testerName"),
      targetUrl: readText(form, "targetUrl"),
      objective: readText(form, "objective"),
      observationNotes: readText(form, "observationNotes"),
      consentConfirmed: readText(form, "consentConfirmed") === "true",
      researchUseConfirmed: readText(form, "researchUseConfirmed") === "true",
    });
    const video = form.get("video");
    if (!(video instanceof File) || !ALLOWED_MEDIA.has(video.type)) {
      throw new Error("A WebM or MP4 calibration recording is required.");
    }
    if (video.size <= 0 || video.size > MAX_MEDIA_BYTES) {
      throw new Error("Calibration recordings must be between 1 byte and 25 MB.");
    }
    const frames = parseFrames(form.get("frames"));
    const bytes = Buffer.from(await video.arrayBuffer());
    const mimeType = video.type as "video/webm" | "video/mp4";
    const id = `cal-${randomUUID()}`;
    const now = new Date().toISOString();
    const media = await saveCalibrationMedia({
      calibrationId: id,
      bytes,
      mimeType,
    });
    const analysis = await analyzeCalibration({
      ...submission,
      frames,
      media: { bytes, mimeType },
    });
    const session = CalibrationSessionSchema.parse({
      id,
      testerName: submission.testerName,
      targetUrl: submission.targetUrl,
      objective: submission.objective,
      consentedAt: now,
      status: "needs_review",
      source: analysis.source,
      transcript: null,
      media,
      evidence: analysis.profile.evidence,
      behaviorRules: analysis.profile.behaviorRules,
      trustBoundaries: analysis.profile.trustBoundaries,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await saveCalibration(session);
    return ok(
      session,
      { fallbackReason: analysis.fallbackReason },
      { status: 201 },
    );
  } catch (error) {
    return validationFailure(error);
  }
}

function readText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function parseFrames(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length > 8) {
    throw new Error("At most eight calibration frames are allowed.");
  }
  return parsed.map((frame) => {
    if (typeof frame !== "string" || frame.length > 1_500_000) {
      throw new Error("Calibration frames must be bounded data URLs.");
    }
    return frame;
  });
}
