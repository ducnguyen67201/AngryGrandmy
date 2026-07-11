import { z } from "zod";
import {
  CalibrationEvidenceSchema,
  type CalibrationSubmission,
} from "@/lib/calibration/calibration";
import { buildCalibrationProfile } from "@/lib/calibration/build-profile";

const NvidiaOutputSchema = z.object({
  transcript: z.string().max(20_000).nullable().default(null),
  observations: z.array(CalibrationEvidenceSchema).max(100),
});

type CalibrationAnalysisInput = Pick<
  CalibrationSubmission,
  "testerName" | "targetUrl" | "objective" | "observationNotes"
> & {
  frames: string[];
  media: { bytes: Buffer; mimeType: "video/webm" | "video/mp4" } | null;
};

const BASE_URL =
  process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
const MODEL =
  process.env.NVIDIA_MODEL ??
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

export async function analyzeCalibration(input: CalibrationAnalysisInput) {
  const fallback = () => ({
    source: "heuristic" as const,
    profile: buildCalibrationProfile({
      testerName: input.testerName,
      observationNotes: input.observationNotes,
      transcript: null,
      observations: [],
    }),
  });

  if (process.env.NVIDIA_VSS_URL && input.media) {
    try {
      const output = await analyzeWithVss(input);
      return {
        source: "nvidia-vss" as const,
        profile: buildCalibrationProfile({
          testerName: input.testerName,
          observationNotes: input.observationNotes,
          ...output,
        }),
        fallbackReason: null,
      };
    } catch {
      // Continue to frame analysis or the deterministic fallback.
    }
  }

  if (process.env.NVIDIA_API_KEY && input.frames.length > 0) {
    try {
      const output = await analyzeWithNemotron(input);
      return {
        source: "nvidia" as const,
        profile: buildCalibrationProfile({
          testerName: input.testerName,
          observationNotes: input.observationNotes,
          ...output,
        }),
        fallbackReason: null,
      };
    } catch {
      return {
        ...fallback(),
        fallbackReason:
          "NVIDIA calibration analysis failed; deterministic review rules were used.",
      };
    }
  }

  return {
    ...fallback(),
    fallbackReason:
      "NVIDIA VSS or frame analysis is not configured; deterministic review rules were used.",
  };
}

async function analyzeWithNemotron(input: CalibrationAnalysisInput) {
  const content = [
    {
      type: "text",
      text: analysisPrompt(input),
    },
    ...input.frames.slice(0, 8).map((frame) => ({
      type: "image_url",
      image_url: { url: validateFrame(frame) },
    })),
  ];
  const response = await fetch(`${BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract observable usability evidence. Do not infer identity, disability, age, diagnosis, or private traits. Return JSON only.",
        },
        { role: "user", content },
      ],
    }),
  });
  if (!response.ok) throw new Error("NVIDIA frame analysis failed.");
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parseModelOutput(json.choices?.[0]?.message?.content);
}

async function analyzeWithVss(input: CalibrationAnalysisInput) {
  const base = new URL(process.env.NVIDIA_VSS_URL!);
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new Error("NVIDIA_VSS_URL must use HTTP or HTTPS.");
  }
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(input.media!.bytes)], { type: input.media!.mimeType }),
    `calibration.${input.media!.mimeType === "video/mp4" ? "mp4" : "webm"}`,
  );
  const uploaded = await fetch(new URL("files", ensureTrailingSlash(base)), {
    method: "POST",
    headers: vssHeaders(),
    body: form,
  });
  if (!uploaded.ok) throw new Error("VSS media upload failed.");
  const uploadJson = (await uploaded.json()) as Record<string, unknown>;
  const id = String(uploadJson.id ?? uploadJson.file_id ?? "");
  if (!id) throw new Error("VSS did not return a media id.");

  const summarized = await fetch(
    new URL("summarize", ensureTrailingSlash(base)),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...vssHeaders() },
      body: JSON.stringify({
        id,
        prompt: analysisPrompt(input),
        system_prompt:
          "Return JSON only with transcript and timestamped observable usability observations.",
      }),
    },
  );
  if (!summarized.ok) throw new Error("VSS summarization failed.");
  const json = (await summarized.json()) as Record<string, unknown>;
  return parseModelOutput(
    typeof json.summary === "string"
      ? json.summary
      : typeof json.content === "string"
        ? json.content
        : JSON.stringify(json),
  );
}

function analysisPrompt(input: CalibrationAnalysisInput) {
  return [
    `Target: ${input.targetUrl}`,
    `Objective: ${input.objective}`,
    `Researcher notes: ${input.observationNotes}`,
    "Return {\"transcript\": string|null, \"observations\": [...] }.",
    "Each observation requires startMs, endMs, type, observation, optional transcript, and confidence 0-1.",
    "Allowed types: hesitation, backtrack, misclick, trust_concern, recovery, success.",
    "Describe only visible or audible evidence. Do not infer demographic or medical traits.",
  ].join("\n");
}

function parseModelOutput(content: string | undefined) {
  if (!content) throw new Error("NVIDIA returned no analysis.");
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return NvidiaOutputSchema.parse(JSON.parse(cleaned));
}

function validateFrame(frame: string) {
  if (
    frame.length > 1_500_000 ||
    !/^data:image\/(?:jpeg|png);base64,[a-zA-Z0-9+/=]+$/.test(frame)
  ) {
    throw new Error("Invalid calibration frame.");
  }
  return frame;
}

function ensureTrailingSlash(url: URL) {
  return new URL(url.href.endsWith("/") ? url.href : `${url.href}/`);
}

function vssHeaders() {
  return process.env.NVIDIA_VSS_TOKEN
    ? { Authorization: `Bearer ${process.env.NVIDIA_VSS_TOKEN}` }
    : {};
}
