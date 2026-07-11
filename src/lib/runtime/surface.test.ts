import { describe, expect, it } from "vitest";
import { resolveLocalSurface } from "./surface";

describe("local surface routing", () => {
  it("serves the usability app when the app surface is requested", () => {
    expect(resolveLocalSurface("app")).toBe("app");
  });

  it("defaults to the marketing surface", () => {
    expect(resolveLocalSurface("marketing")).toBe("marketing");
    expect(resolveLocalSurface(undefined)).toBe("marketing");
    expect(resolveLocalSurface("unexpected")).toBe("marketing");
  });
});
