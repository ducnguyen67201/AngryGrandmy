import { describe, expect, it } from "vitest";
import { createCustomPersona } from "./create-custom-persona";

describe("createCustomPersona", () => {
  it("turns a plain-language description into an H-ready persona", () => {
    const persona = createCustomPersona({
      displayName: "Alex",
      description:
        "A color-blind parent shopping on a phone who distrusts surprise subscriptions.",
      digitalConfidence: "medium",
      objective: "Find a product and reach checkout review.",
      globalSafetyBoundaries: [
        "Use synthetic information only.",
        "Stop before payment or order placement.",
      ],
    });

    expect(persona).toMatchObject({
      id: "custom-alex",
      displayName: "Alex",
      tagline: "Custom mobile-minded tester",
      digitalConfidence: "medium",
      context:
        "A color-blind parent shopping on a phone who distrusts surprise subscriptions.",
      task: "Find a product and reach checkout review.",
      visualVariant: 3,
    });
    expect(persona.behaviors[0]).toContain("color-blind parent");
    expect(persona.stopConditions).toContain("Stop before payment or order placement.");
    expect(persona.introLine).toContain("Alex");
  });

  it("rejects blank or excessively long persona descriptions", () => {
    expect(() =>
      createCustomPersona({
        displayName: "Alex",
        description: "   ",
        digitalConfidence: "low",
        objective: "Explore the primary workflow.",
        globalSafetyBoundaries: ["Use synthetic information only."],
      }),
    ).toThrow();

    expect(() =>
      createCustomPersona({
        displayName: "Alex",
        description: "x".repeat(1201),
        digitalConfidence: "low",
        objective: "Explore the primary workflow.",
        globalSafetyBoundaries: ["Use synthetic information only."],
      }),
    ).toThrow();
  });
});
