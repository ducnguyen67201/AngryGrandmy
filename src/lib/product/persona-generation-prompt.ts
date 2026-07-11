import type { AnalyzeRequest, ProductAnalysis } from "@/lib/schemas/run";

export function buildPersonaGenerationPrompt(
  request: AnalyzeRequest,
  heuristic: ProductAnalysis,
) {
  return JSON.stringify({
    instruction:
      "Invent four product-specific behavioral personas for this exact URL and objective, then produce a GrannySmith usability test plan for H Company computer-use agents. Keep exactly four internal ids: linda, rosa, mei, joan, but replace their displayName, tagline, context, task, behaviors, and risk profile with distinct users who plausibly need this product. Do not reuse Linda, Rosa, Mei, or Joan as display names unless the product evidence gives a strong reason. Avoid stereotypes and demographics that are not relevant to product behavior. Add dispatchInstruction for each persona. Stop before real purchase, booking, payment, account mutation, private data submission, credentials, or irreversible actions.",
    target: {
      url: request.url,
      objective: request.objective ?? null,
    },
    requiredShape: {
      productName: "string",
      productCategory: "string",
      summary: "string",
      primaryFlows: [
        {
          name: "string",
          goal: "string",
          safeStopPoint: "string",
        },
      ],
      globalSafetyBoundaries: ["string"],
      personas: [
        {
          id: "linda|rosa|mei|joan",
          displayName: "string",
          tagline: "string",
          context: "string",
          digitalConfidence: "low|medium|high",
          behaviors: ["string"],
          accessibilityContext: ["string"],
          trustBoundaries: ["string"],
          task: "string",
          successCriteria: ["string"],
          stopConditions: ["string"],
          expectedStepBudget: "integer 4-30",
          introLine: "string max 240 chars",
          dispatchInstruction: "string max 4000 chars",
          voiceSlot: "0|1|2|3",
          visualVariant: "0|1|2|3",
        },
      ],
    },
    heuristic,
  });
}
