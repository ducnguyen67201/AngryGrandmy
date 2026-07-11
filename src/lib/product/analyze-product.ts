import type {
  AnalyzeRequest,
  PersonaScenario,
  ProductAnalysis,
} from "@/lib/schemas/run";
import { ProductAnalysisSchema } from "@/lib/schemas/run";

type ProductDomain = {
  category: string;
  taskNoun: string;
  primaryAction: string;
  safeStopPoint: string;
  trustRisk: string;
  jargonRisk: string;
  irreversibleAction: string;
  likelyDataRequest: string;
  expectedStepBudget: number;
};

type PersonaSeed = {
  id: string;
  displayName: string;
  tagline: string;
  digitalConfidence: PersonaScenario["digitalConfidence"];
  contextTemplate: string;
  behaviors: string[];
  accessibilityContext: string[];
  trustBoundariesTemplate: string[];
  taskAngle: string;
  expectedStepBudgetOffset: number;
  introTemplate: string;
  voiceSlot: 0 | 1 | 2 | 3;
  visualVariant: 0 | 1 | 2 | 3;
};

export type ProductAnalysisMode = "openai" | "holo" | "heuristic";

export type ProductAnalysisPlan = {
  analysis: ProductAnalysis;
  mode: ProductAnalysisMode;
  model: string | null;
  fallbackReason: string | null;
};

type HoloChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
    }>;
  }>;
};

const HOLO_BASE_URL =
  process.env.HAI_MODELS_BASE_URL ?? "https://api.hcompany.ai/v1";
const HOLO_MODEL = process.env.HAI_PERSONA_MODEL ?? "holo3-1-35b-a3b";
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_PERSONA_MODEL ?? "gpt-4.1-mini";

const DOMAINS: Array<{ match: RegExp; value: ProductDomain }> = [
  {
    match: /doctor|clinic|health|appointment|patient|medical|care|dental|therapy|pharma|hospital/i,
    value: {
      category: "healthcare scheduling",
      taskNoun: "appointment path",
      primaryAction: "start the right care or appointment request",
      safeStopPoint:
        "Stop before submitting patient details, insurance details, payment, or a real appointment request.",
      trustRisk:
        "private health, insurance, or account information requested before the user understands why",
      jargonRisk: "clinical or insurance wording",
      irreversibleAction: "booking a real visit",
      likelyDataRequest: "patient, insurance, or date-of-birth information",
      expectedStepBudget: 12,
    },
  },
  {
    match: /checkout|cart|shop|buy|order|store|commerce|product|retail|market/i,
    value: {
      category: "commerce checkout",
      taskNoun: "purchase path",
      primaryAction: "find the right product and reach the pre-purchase review step",
      safeStopPoint:
        "Stop before placing an order, entering payment details, saving a card, or confirming purchase.",
      trustRisk: "shipping, return, or payment terms hidden until late in checkout",
      jargonRisk: "promotion, subscription, or fulfillment wording",
      irreversibleAction: "placing a real order",
      likelyDataRequest: "address, payment, or account information",
      expectedStepBudget: 11,
    },
  },
  {
    match: /bank|finance|loan|insurance|tax|payment|invest|credit|mortgage/i,
    value: {
      category: "financial services",
      taskNoun: "account or quote path",
      primaryAction: "understand the safest next step without exposing sensitive financial data",
      safeStopPoint:
        "Stop before entering SSN, bank credentials, payment data, credit checks, or binding applications.",
      trustRisk: "financial or identity information requested before the value is clear",
      jargonRisk: "legal, rate, fee, or underwriting wording",
      irreversibleAction: "submitting a financial application",
      likelyDataRequest: "identity, income, banking, or payment information",
      expectedStepBudget: 13,
    },
  },
  {
    match: /book|reservation|hotel|flight|travel|ticket|restaurant|event|rental/i,
    value: {
      category: "booking workflow",
      taskNoun: "reservation path",
      primaryAction: "compare options and reach the reservation review step",
      safeStopPoint:
        "Stop before confirming a booking, sending a real message, payment, or cancellation-risk action.",
      trustRisk: "availability, cancellation, or fee details hidden until confirmation",
      jargonRisk: "policy, availability, or fare wording",
      irreversibleAction: "confirming a real reservation",
      likelyDataRequest: "guest, contact, payment, or schedule information",
      expectedStepBudget: 12,
    },
  },
  {
    match: /saas|software|dashboard|platform|api|developer|workspace|crm|analytics|project/i,
    value: {
      category: "software onboarding",
      taskNoun: "onboarding path",
      primaryAction: "understand the product and reach a safe setup or demo step",
      safeStopPoint:
        "Stop before inviting teammates, connecting accounts, changing production data, or sending messages.",
      trustRisk: "permissions or integrations requested before the user understands consequences",
      jargonRisk: "technical setup, role, integration, or workspace wording",
      irreversibleAction: "changing real workspace data",
      likelyDataRequest: "account, workspace, permission, or integration information",
      expectedStepBudget: 10,
    },
  },
];

const FALLBACK_DOMAIN: ProductDomain = {
  category: "consumer web workflow",
  taskNoun: "primary task path",
  primaryAction: "complete the main user task safely",
  safeStopPoint:
    "Stop before payment, account creation, booking confirmation, private data submission, or any irreversible action.",
  trustRisk: "personal information requested before the user understands the next step",
  jargonRisk: "product-specific wording",
  irreversibleAction: "submitting a real request",
  likelyDataRequest: "contact, account, or personal information",
  expectedStepBudget: 11,
};

const PERSONA_SEEDS: [PersonaSeed, PersonaSeed, PersonaSeed, PersonaSeed] = [
  {
    id: "linda",
    displayName: "Linda",
    tagline: "Careful first-time visitor",
    digitalConfidence: "low",
    contextTemplate:
      "Linda is an older adult trying to use {productName} for the first time. She reads slowly, worries about clicking the wrong thing, and needs plain confirmation before moving forward.",
    behaviors: [
      "Reads button labels literally and avoids ambiguous calls to action.",
      "Pauses when the page uses internal vocabulary or unexplained icons.",
      "Backtracks once if the next step feels binding.",
    ],
    accessibilityContext: [
      "Uses browser zoom.",
      "Needs strong labels and visible focus/selection feedback.",
    ],
    trustBoundariesTemplate: [
      "Will not provide {likelyDataRequest} before understanding why it is needed.",
      "Will stop before {irreversibleAction}.",
    ],
    taskAngle: "Find the safest way to {primaryAction}",
    expectedStepBudgetOffset: 1,
    introTemplate:
      "I am Linda. I want to {primaryAction}, but I need to know nothing real is being submitted yet.",
    voiceSlot: 0,
    visualVariant: 0,
  },
  {
    id: "rosa",
    displayName: "Rosa",
    tagline: "Caregiver scanning on mobile",
    digitalConfidence: "medium",
    contextTemplate:
      "Rosa is helping a family member use {productName}. She is on a small screen, scanning quickly, and needs the page to say what information is required next.",
    behaviors: [
      "Skims headings before reading details.",
      "Uses navigation or search if the first path is unclear.",
      "Looks for reassurance that she can help someone else.",
    ],
    accessibilityContext: [
      "Simulates narrow viewport scanning.",
      "Needs important guidance near the primary action.",
    ],
    trustBoundariesTemplate: [
      "Will stop if asked for another person's private data without explanation.",
      "Will stop before {irreversibleAction}.",
    ],
    taskAngle:
      "Help someone else {primaryAction} and identify what information will be needed",
    expectedStepBudgetOffset: 0,
    introTemplate:
      "I am Rosa. I am helping someone else, so I need the site to make the next step obvious.",
    voiceSlot: 1,
    visualVariant: 1,
  },
  {
    id: "mei",
    displayName: "Mei",
    tagline: "Cautious comparison shopper",
    digitalConfidence: "medium",
    contextTemplate:
      "Mei compares options carefully before trusting {productName}. She is comfortable online but abandons flows when fees, policies, or consequences are vague.",
    behaviors: [
      "Opens secondary details before committing.",
      "Compares labels and examples before choosing an option.",
      "Stops when trust or cost information appears late.",
    ],
    accessibilityContext: [
      "Reads slowly.",
      "Needs plain-language examples under similar-looking choices.",
    ],
    trustBoundariesTemplate: [
      "Will not continue if {trustRisk}.",
      "Will stop before {irreversibleAction}.",
    ],
    taskAngle: "Compare the available options and then {primaryAction}",
    expectedStepBudgetOffset: 3,
    introTemplate:
      "I am Mei. I need to compare the choices before I click anything serious.",
    voiceSlot: 2,
    visualVariant: 2,
  },
  {
    id: "joan",
    displayName: "Joan",
    tagline: "Low-confidence desktop user",
    digitalConfidence: "low",
    contextTemplate:
      "Joan uses {productName} from a desktop computer. She recognizes common words but not product-specific terms, unlabeled icons, or subtle visual state changes.",
    behaviors: [
      "Ignores unlabeled icons.",
      "Gives up after two confusing loops.",
      "Looks for a phone-like or human-help backup path.",
    ],
    accessibilityContext: [
      "Reduced fine motor confidence.",
      "Avoids dense menus and tiny controls.",
    ],
    trustBoundariesTemplate: [
      "Will not create an account just to understand the basic path.",
      "Will stop before {irreversibleAction}.",
    ],
    taskAngle:
      "Try to {primaryAction} without relying on unlabeled icons or hidden menus",
    expectedStepBudgetOffset: 2,
    introTemplate:
      "I am Joan. If it is only an icon, I probably will not know whether it is safe to press.",
    voiceSlot: 3,
    visualVariant: 3,
  },
];

export function buildProductAnalysis(request: AnalyzeRequest): ProductAnalysis {
  const url = new URL(request.url);
  const productName = titleFromHost(url.hostname);
  const objective = normalizeObjective(request.objective, productName);
  const domain = inferDomain(`${url.hostname} ${objective}`);
  const primaryAction = objective || domain.primaryAction;
  const flowName = toSentenceCase(primaryAction);
  const analysis: ProductAnalysis = {
    productName,
    productCategory: domain.category,
    summary: `${productName} appears to be a ${domain.category} product. GrannySmith will test whether low-confidence users can ${primaryAction} without crossing a real-world commitment boundary.`,
    primaryFlows: [
      {
        name: flowName,
        goal: `Find and follow the path to ${primaryAction}.`,
        safeStopPoint: domain.safeStopPoint,
      },
    ],
    globalSafetyBoundaries: [
      "Use synthetic information only.",
      domain.safeStopPoint,
      "Do not submit purchases, bookings, applications, account changes, private messages, credentials, or sensitive personal data.",
      "Prefer observing and reporting friction over completing any irreversible action.",
    ],
    personas: PERSONA_SEEDS.map((seed) =>
      buildPersona(seed, productName, primaryAction, domain),
    ) as ProductAnalysis["personas"],
  };

  return ProductAnalysisSchema.parse(analysis);
}

export async function buildProductAnalysisPlan(
  request: AnalyzeRequest,
): Promise<ProductAnalysisPlan> {
  const heuristic = buildProductAnalysis(request);

  if (process.env.GRANNYSMITH_PERSONA_MODE === "heuristic") {
    return {
      analysis: heuristic,
      mode: "heuristic",
      model: null,
      fallbackReason: "GRANNYSMITH_PERSONA_MODE=heuristic",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const refined = await refineWithOpenAI(request, heuristic);
      return {
        analysis: refined,
        mode: "openai",
        model: OPENAI_MODEL,
        fallbackReason: null,
      };
    } catch (error) {
      if (!process.env.HAI_API_KEY) {
        return {
          analysis: heuristic,
          mode: "heuristic",
          model: null,
          fallbackReason:
            error instanceof Error
              ? error.message
              : "OpenAI persona generation failed.",
        };
      }
    }
  }

  if (!process.env.HAI_API_KEY) {
    return {
      analysis: heuristic,
      mode: "heuristic",
      model: null,
      fallbackReason: "No LLM API key is configured.",
    };
  }

  try {
    const refined = await refineWithHolo(request, heuristic);
    return {
      analysis: refined,
      mode: "holo",
      model: HOLO_MODEL,
      fallbackReason: null,
    };
  } catch (error) {
    return {
      analysis: heuristic,
      mode: "heuristic",
      model: null,
      fallbackReason:
        error instanceof Error ? error.message : "Holo persona generation failed.",
    };
  }
}

function buildPersona(
  seed: PersonaSeed,
  productName: string,
  primaryAction: string,
  domain: ProductDomain,
): PersonaScenario {
  const interpolate = (value: string) =>
    value
      .replaceAll("{productName}", productName)
      .replaceAll("{primaryAction}", primaryAction)
      .replaceAll("{likelyDataRequest}", domain.likelyDataRequest)
      .replaceAll("{irreversibleAction}", domain.irreversibleAction)
      .replaceAll("{trustRisk}", domain.trustRisk)
      .replaceAll("{jargonRisk}", domain.jargonRisk);

  const task = `${interpolate(seed.taskAngle)}. Stop at: ${domain.safeStopPoint}`;
  const persona: PersonaScenario = {
    id: seed.id,
    displayName: seed.displayName,
    tagline: seed.tagline,
    context: interpolate(seed.contextTemplate),
    digitalConfidence: seed.digitalConfidence,
    behaviors: seed.behaviors,
    accessibilityContext: seed.accessibilityContext,
    trustBoundaries: seed.trustBoundariesTemplate.map(interpolate),
    task,
    successCriteria: [
      `Identifies the correct ${domain.taskNoun}.`,
      `Understands what information or commitment is required next.`,
      "Stops before the defined safety boundary.",
    ],
    stopConditions: [
      domain.safeStopPoint,
      `Any request for ${domain.likelyDataRequest} before the reason is clear.`,
      `Any step that appears to risk ${domain.irreversibleAction}.`,
    ],
    expectedStepBudget: clampStepBudget(
      domain.expectedStepBudget + seed.expectedStepBudgetOffset,
    ),
    introLine: interpolate(seed.introTemplate).slice(0, 240),
    voiceSlot: seed.voiceSlot,
    visualVariant: seed.visualVariant,
  };

  return {
    ...persona,
    dispatchInstruction: buildDispatchInstruction(
      productName,
      domain,
      persona,
    ),
  };
}

function buildDispatchInstruction(
  productName: string,
  domain: ProductDomain,
  persona: PersonaScenario,
): string {
  return [
    `Run a synthetic usability test for ${productName} as ${persona.displayName}.`,
    `Persona context: ${persona.context}`,
    `Task: ${persona.task}`,
    `Simulated behaviors: ${persona.behaviors.join("; ")}`,
    `Accessibility context: ${persona.accessibilityContext.join("; ")}`,
    `Trust boundaries: ${persona.trustBoundaries.join("; ")}`,
    `Success criteria: ${persona.successCriteria.join("; ")}`,
    `Stop conditions: ${persona.stopConditions.join("; ")}`,
    `Risk to watch for: ${domain.jargonRisk}; ${domain.trustRisk}.`,
    "Do not submit real data, real bookings, real purchases, real messages, credentials, or irreversible actions.",
    "When finished, report completion status, evidence, friction events, visible evidence, and concrete recommendations.",
  ].join("\n");
}

function titleFromHost(hostname: string): string {
  const clean =
    hostname
      .replace(/^www\./, "")
      .split(".")
      .filter(Boolean)[0] ?? "Target Product";

  return clean
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeObjective(objective: string | undefined, productName: string) {
  const trimmed = objective?.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .replace(/^i want to\s+/i, "")
    .replace(/^user wants to\s+/i, "")
    .replace(/^help me\s+/i, "")
    .replaceAll(productName, "the product");
}

function inferDomain(text: string): ProductDomain {
  return DOMAINS.find((domain) => domain.match.test(text))?.value ?? FALLBACK_DOMAIN;
}

function toSentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Primary workflow";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function clampStepBudget(value: number) {
  return Math.max(4, Math.min(30, value));
}

async function refineWithHolo(
  request: AnalyzeRequest,
  heuristic: ProductAnalysis,
): Promise<ProductAnalysis> {
  const response = await fetch(`${HOLO_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: HOLO_MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate structured synthetic usability test plans. Return valid JSON only. Do not include markdown.",
        },
        {
          role: "user",
          content: buildPersonaGenerationPrompt(request, heuristic),
        },
      ],
    }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!response.ok) {
    throw new Error(`Holo persona generation failed with ${response.status}.`);
  }

  const json = (await response.json()) as HoloChatResponse;
  const content = json.choices?.[0]?.message?.content;
  const parsed = parseModelJson(content);
  return normalizeModelAnalysis(parsed, heuristic);
}

async function refineWithOpenAI(
  request: AnalyzeRequest,
  heuristic: ProductAnalysis,
): Promise<ProductAnalysis> {
  const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You generate structured synthetic usability test plans. Return valid JSON only. Do not include markdown.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPersonaGenerationPrompt(request, heuristic),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI persona generation failed with ${response.status}: ${body.slice(0, 500)}`,
    );
  }

  const json = (await response.json()) as OpenAIResponse;
  const parsed = parseModelJson(readOpenAIText(json));
  return normalizeModelAnalysis(parsed, heuristic);
}

function normalizeModelAnalysis(
  parsed: unknown,
  heuristic: ProductAnalysis,
): ProductAnalysis {
  const candidate = ProductAnalysisSchema.parse(parsed);

  return ProductAnalysisSchema.parse({
    ...candidate,
    personas: candidate.personas.map((persona, index) => ({
      ...persona,
      id: heuristic.personas[index].id,
      voiceSlot: heuristic.personas[index].voiceSlot,
      visualVariant: heuristic.personas[index].visualVariant,
      dispatchInstruction:
        persona.dispatchInstruction ??
        buildDispatchInstruction(
          candidate.productName,
          {
            category: candidate.productCategory,
            taskNoun: "workflow",
            primaryAction: candidate.primaryFlows[0]?.goal ?? "complete the task",
            safeStopPoint:
              candidate.primaryFlows[0]?.safeStopPoint ??
              heuristic.primaryFlows[0].safeStopPoint,
            trustRisk: persona.trustBoundaries.join("; "),
            jargonRisk: "product-specific wording",
            irreversibleAction: persona.stopConditions[0] ?? "an irreversible action",
            likelyDataRequest: "personal information",
            expectedStepBudget: persona.expectedStepBudget,
          },
          persona,
        ),
    })) as ProductAnalysis["personas"],
  });
}

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

function readOpenAIText(json: OpenAIResponse): unknown {
  if (typeof json.output_text === "string") return json.output_text;

  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return null;
}

function parseModelJson(content: unknown): unknown {
  if (typeof content !== "string") {
    throw new Error("Holo response did not include string content.");
  }

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Holo response was not valid JSON.");
    return JSON.parse(match[0]);
  }
}
