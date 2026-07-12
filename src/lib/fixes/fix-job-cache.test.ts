import { describe, expect, it } from "vitest";
import { shouldReuseFixJob } from "./fix-job-cache";

describe("fix proposal cache", () => {
  it("does not reuse a fallback proposal after codebase mode becomes available", () => {
    expect(shouldReuseFixJob({ mode: "fallback" }, "codex")).toBe(false);
  });

  it("reuses a proposal generated in the current mode", () => {
    expect(shouldReuseFixJob({ mode: "codex" }, "codex")).toBe(true);
  });
});
