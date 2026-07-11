import { AnalyzeRequestSchema, type AnalyzeRequest } from "@/lib/schemas/run";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^\[?::1\]?$/i,
];

export function validateAnalyzeRequest(input: unknown): AnalyzeRequest {
  const rawUrl =
    typeof input === "object" && input !== null && "url" in input
      ? (input as { url?: unknown }).url
      : null;

  if (typeof rawUrl === "string") {
    const protocol = rawUrl.split(":", 1)[0]?.toLowerCase();
    if (protocol && protocol !== "http" && protocol !== "https") {
      throw new Error("Only HTTP and HTTPS URLs can be tested.");
    }
  }

  const parsed = AnalyzeRequestSchema.parse(input);
  const url = new URL(parsed.url);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs can be tested.");
  }

  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error("Private, localhost, and link-local URLs are blocked.");
  }

  return parsed;
}
