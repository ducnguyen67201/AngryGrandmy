import { demoAnalysis } from "@/lib/fixtures/demo-run";
import type { AnalyzeRequest, ProductAnalysis } from "@/lib/schemas/run";

export function buildProductAnalysis(request: AnalyzeRequest): ProductAnalysis {
  const url = new URL(request.url);
  const productName = titleFromHost(url.hostname);
  const objective =
    request.objective?.trim() || demoAnalysis.personas[0].task;
  const category = inferCategory(`${url.hostname} ${objective}`);

  return {
    ...demoAnalysis,
    productName,
    productCategory: category,
    summary: `A ${category} product where a low-confidence user needs to complete: ${objective}`,
    primaryFlows: [
      {
        name: objective,
        goal: `Complete the task "${objective}" without irreversible submission.`,
        safeStopPoint:
          "Stop before payment, account creation, purchase, booking confirmation, private data submission, or any irreversible action.",
      },
    ],
    personas: demoAnalysis.personas.map((persona, index) => ({
      ...persona,
      task: personalizeTask(persona.task, objective, index),
      successCriteria: [
        `Finds the path for: ${objective}`,
        "Reaches the safe stop point or clearly identifies why they cannot continue.",
      ],
    })) as ProductAnalysis["personas"],
  };
}

function titleFromHost(hostname: string): string {
  const clean = hostname
    .replace(/^www\./, "")
    .split(".")
    .filter(Boolean)[0] ?? "Target Product";

  return clean
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/doctor|clinic|health|appointment|patient|medical/.test(lower)) {
    return "healthcare scheduling";
  }
  if (/checkout|cart|shop|buy|order|store|commerce/.test(lower)) {
    return "commerce checkout";
  }
  if (/bank|finance|loan|insurance|tax|payment/.test(lower)) {
    return "financial services";
  }
  if (/book|reservation|hotel|flight|travel|ticket/.test(lower)) {
    return "booking workflow";
  }
  return "consumer web workflow";
}

function personalizeTask(baseTask: string, objective: string, index: number) {
  const suffixes = [
    "without accidentally committing to anything",
    "while understanding what information is required next",
    "while comparing confusing options before continuing",
    "without relying on unlabeled icons or tiny controls",
  ];

  return `${objective}; ${suffixes[index] ?? baseTask}.`;
}
