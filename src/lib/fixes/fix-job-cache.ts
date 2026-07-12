export function shouldReuseFixJob(
  existing: Record<string, unknown> | undefined,
  desiredMode: "codex" | "fallback",
) {
  return existing?.mode === desiredMode;
}
