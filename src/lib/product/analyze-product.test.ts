import { describe, expect, it } from "vitest";
import { buildProductAnalysis } from "./analyze-product";
import { buildPersonaGenerationPrompt } from "./persona-generation-prompt";

const baseRequest = {
  authorizationConfirmed: true,
} as const;

describe("buildProductAnalysis", () => {
  it("generates four dispatch-ready personas for healthcare workflows", () => {
    const analysis = buildProductAnalysis({
      ...baseRequest,
      url: "https://mission-clinic.example",
      objective: "Book a doctor's visit",
    });

    expect(analysis.productName).toBe("Mission Clinic");
    expect(analysis.productCategory).toBe("healthcare scheduling");
    expect(analysis.personas).toHaveLength(4);
    expect(analysis.personas.map((persona) => persona.id)).toEqual([
      "linda",
      "rosa",
      "mei",
      "joan",
    ]);
    expect(analysis.personas[0].task).toContain("Book a doctor's visit");
    expect(analysis.personas[0].dispatchInstruction).toContain(
      "Run a synthetic usability test",
    );
    expect(analysis.personas[0].stopConditions.join(" ")).toContain(
      "patient details",
    );
  });

  it("changes domain-specific boundaries for commerce workflows", () => {
    const analysis = buildProductAnalysis({
      ...baseRequest,
      url: "https://shop-acme.example",
      objective: "Buy a replacement phone charger",
    });

    expect(analysis.productCategory).toBe("commerce checkout");
    expect(analysis.primaryFlows[0].safeStopPoint).toContain("placing an order");
    expect(analysis.personas[2].trustBoundaries.join(" ")).toContain(
      "shipping, return, or payment terms",
    );
  });

  it("asks the model to invent product-specific personas instead of reusing seed identities", () => {
    const request = {
      ...baseRequest,
      url: "https://developer-tools.example",
      objective: "Integrate the API safely",
    };
    const prompt = buildPersonaGenerationPrompt(
      request,
      buildProductAnalysis(request),
    );

    expect(prompt).toContain("Invent four product-specific behavioral personas");
    expect(prompt).toContain("Do not reuse Linda, Rosa, Mei, or Joan");
  });
});
