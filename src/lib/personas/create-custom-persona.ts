import { z } from "zod";
import {
  PersonaScenarioSchema,
  type PersonaScenario,
} from "@/lib/schemas/run";

const CustomPersonaInputSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  description: z.string().trim().min(12).max(1200),
  digitalConfidence: z.enum(["low", "medium", "high"]),
  objective: z.string().trim().min(1).max(500),
  globalSafetyBoundaries: z.array(z.string().trim().min(1)).min(1),
});

export type CustomPersonaInput = z.input<typeof CustomPersonaInputSchema>;

export function createCustomPersona(input: CustomPersonaInput): PersonaScenario {
  const parsed = CustomPersonaInputSchema.parse(input);
  const idName = parsed.displayName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tester";

  return PersonaScenarioSchema.parse({
    id: `custom-${idName}`,
    displayName: parsed.displayName,
    tagline: "Custom mobile-minded tester",
    context: parsed.description,
    digitalConfidence: parsed.digitalConfidence,
    behaviors: [
      `Tests from this lived context: ${parsed.description}`,
      "Explains uncertainty before retrying or abandoning a step.",
    ],
    accessibilityContext: [
      "Uses any accessibility needs and device constraints stated in the custom description.",
    ],
    trustBoundaries: parsed.globalSafetyBoundaries,
    task: parsed.objective,
    successCriteria: [
      "Attempts the requested workflow from the custom persona's perspective.",
      "Reports visible evidence for every friction point.",
    ],
    stopConditions: parsed.globalSafetyBoundaries,
    expectedStepBudget: 14,
    introLine: `I'm ${parsed.displayName}. I'll test this product from the perspective described in my custom persona.`,
    voiceSlot: 3,
    visualVariant: 3,
  });
}
