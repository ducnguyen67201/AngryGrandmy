import { calculateUsabilityReport } from "@/lib/scoring/calculate-report";
import type {
  NormalizedSession,
  ProductAnalysis,
  RunSnapshot,
} from "@/lib/schemas/run";

const now = "2026-07-11T16:30:00.000Z";

export const demoAnalysis: ProductAnalysis = {
  productName: "Mission Street Health",
  productCategory: "healthcare scheduling",
  summary:
    "A patient-facing site where visitors compare visit types and begin a doctor's appointment request.",
  primaryFlows: [
    {
      name: "Find and start an appointment request",
      goal: "Choose the right visit option and reach the confirmation review step.",
      safeStopPoint: "Stop before submitting any real appointment request.",
    },
  ],
  globalSafetyBoundaries: [
    "Use synthetic patient information only.",
    "Never submit a real appointment, payment, message, or medical details.",
    "Stop at the review screen or when the site asks for sensitive information.",
  ],
  personas: [
    {
      id: "linda",
      displayName: "Linda",
      tagline: "Careful first-time patient",
      context:
        "Linda is trying to book a routine checkup while avoiding anything that feels like a binding commitment.",
      digitalConfidence: "low",
      behaviors: [
        "Pauses when labels use internal medical vocabulary.",
        "Looks for reassuring confirmation before continuing.",
        "Retries once before choosing the browser back button.",
      ],
      accessibilityContext: ["Uses browser zoom", "Prefers plain language"],
      trustBoundaries: [
        "Will not enter insurance details before understanding the visit type.",
      ],
      task: "Find where to start a routine doctor visit request and stop before submitting it.",
      successCriteria: [
        "Identifies the primary booking path.",
        "Reaches a review or pre-submit step.",
      ],
      stopConditions: [
        "Payment, account creation, real appointment submission, or sensitive health details are requested.",
      ],
      expectedStepBudget: 12,
      introLine:
        "I'm Linda. I just want to know where to start without accidentally booking the wrong thing.",
      voiceSlot: 0,
      visualVariant: 0,
    },
    {
      id: "rosa",
      displayName: "Rosa",
      tagline: "Mobile-first caregiver",
      context:
        "Rosa is helping a family member and scans quickly for familiar words.",
      digitalConfidence: "medium",
      behaviors: [
        "Skims headings before reading paragraphs.",
        "Uses search or navigation if the first call to action is unclear.",
      ],
      accessibilityContext: ["Simulates narrow viewport scanning"],
      trustBoundaries: ["Will stop if asked for a real patient's private data."],
      task: "Find the appointment path for a family member and identify what information is needed.",
      successCriteria: [
        "Finds appointment flow.",
        "Understands prerequisites without submitting real information.",
      ],
      stopConditions: ["Real patient data or irreversible appointment submission."],
      expectedStepBudget: 10,
      introLine:
        "I'm Rosa. I'm helping someone else, so I need the site to be very clear about what happens next.",
      voiceSlot: 1,
      visualVariant: 1,
    },
    {
      id: "mei",
      displayName: "Mei",
      tagline: "Cautious comparison shopper",
      context:
        "Mei compares options and distrusts vague pricing or insurance language.",
      digitalConfidence: "medium",
      behaviors: [
        "Opens secondary information before committing.",
        "Backtracks when a label sounds like a sales term.",
      ],
      accessibilityContext: ["Reads slowly", "Needs strong feedback after clicks"],
      trustBoundaries: ["Will not continue if costs or insurance handling are hidden."],
      task: "Compare appointment options and begin the safest routine-care option.",
      successCriteria: ["Chooses a visit type", "Reaches the safe stop point"],
      stopConditions: ["Payment, hidden fees, or real booking confirmation."],
      expectedStepBudget: 14,
      introLine:
        "I'm Mei. I need to understand the difference between the options before I click anything serious.",
      voiceSlot: 2,
      visualVariant: 2,
    },
    {
      id: "joan",
      displayName: "Joan",
      tagline: "Low-confidence desktop user",
      context:
        "Joan recognizes common words but not icons or product-specific phrases.",
      digitalConfidence: "low",
      behaviors: [
        "Ignores unlabeled icons.",
        "Gives up after two confusing loops.",
        "Looks for a phone-like backup path.",
      ],
      accessibilityContext: ["Reduced fine motor confidence", "Avoids dense menus"],
      trustBoundaries: ["Will not create an account to browse basic availability."],
      task: "Try to start a doctor's visit request without using unlabeled icons.",
      successCriteria: ["Finds the booking entry point", "Understands the safe stop"],
      stopConditions: ["Account wall, real booking, payment, or sensitive data."],
      expectedStepBudget: 12,
      introLine:
        "I'm Joan. If it is only an icon, I probably will not know whether it is safe to press.",
      voiceSlot: 3,
      visualVariant: 3,
    },
  ],
};

export const demoSessions: NormalizedSession[] = [
  {
    sessionId: "demo-linda",
    personaId: "linda",
    status: "completed",
    visualState: "succeeded",
    eventCursor: 13,
    stepCount: 11,
    startedAt: now,
    finishedAt: "2026-07-11T16:32:10.000Z",
    agentViewUrl: "https://dashboard.eu.hcompany.ai/demo/linda",
    outcome: "success",
    latestActionLabel: "Stopped at appointment review",
    errorCode: null,
    finding: {
      completion: "success",
      summary:
        "Linda reached the safe review point, but hesitated over clinical wording.",
      evidence: ["Clicked Book a Visit", "Stopped before final submission"],
      safeStopReached: true,
      frictionEvents: [
        {
          step: 4,
          category: "clarity",
          severity: 3,
          observation: "The label 'care modality' slowed Linda down.",
          visibleEvidence: "A selector labelled Care modality appears above visit types.",
          recommendation: "Rename 'care modality' to 'type of visit'.",
          narratedObservation:
            "I do not know what care modality means, but I think it is asking what kind of visit I want.",
          recovered: true,
        },
      ],
    },
  },
  {
    sessionId: "demo-rosa",
    personaId: "rosa",
    status: "completed",
    visualState: "succeeded",
    eventCursor: 10,
    stepCount: 9,
    startedAt: now,
    finishedAt: "2026-07-11T16:31:42.000Z",
    agentViewUrl: "https://dashboard.eu.hcompany.ai/demo/rosa",
    outcome: "success",
    latestActionLabel: "Identified needed information",
    errorCode: null,
    finding: {
      completion: "success",
      summary: "Rosa completed the flow after finding the family-member note.",
      evidence: ["Opened FAQ", "Returned to booking path"],
      safeStopReached: true,
      frictionEvents: [
        {
          step: 3,
          category: "navigation",
          severity: 2,
          observation: "The family-member guidance was below the fold.",
          visibleEvidence: "Family member guidance appears below appointment cards.",
          recommendation:
            "Move family-member appointment guidance near the primary call to action.",
          narratedObservation:
            "I found it, but I had to leave the booking cards to understand if I can help someone else.",
          recovered: true,
        },
      ],
    },
  },
  {
    sessionId: "demo-mei",
    personaId: "mei",
    status: "completed",
    visualState: "confused",
    eventCursor: 18,
    stepCount: 18,
    startedAt: now,
    finishedAt: "2026-07-11T16:33:05.000Z",
    agentViewUrl: "https://dashboard.eu.hcompany.ai/demo/mei",
    outcome: "failure",
    latestActionLabel: "Backtracked from insurance step",
    errorCode: null,
    finding: {
      completion: "partial",
      summary:
        "Mei found the booking path but backed out when insurance language appeared without context.",
      evidence: ["Compared visit options", "Backtracked from insurance screen"],
      safeStopReached: false,
      frictionEvents: [
        {
          step: 7,
          category: "trust",
          severity: 4,
          observation: "Insurance request appeared before explaining why it was needed.",
          visibleEvidence:
            "Insurance details required before showing available appointment times.",
          recommendation:
            "Explain why insurance is requested and offer a 'show self-pay options' path.",
          narratedObservation:
            "I am not ready to give insurance details before I can see what kind of appointment is available.",
          recovered: false,
        },
        {
          step: 11,
          category: "clarity",
          severity: 3,
          observation: "Visit labels did not explain the practical difference.",
          visibleEvidence: "Cards say Primary, Virtual, Care modality without examples.",
          recommendation:
            "Add one plain-language example under each visit option.",
          narratedObservation:
            "These choices sound official, but I cannot tell which one fits a normal checkup.",
          recovered: false,
        },
      ],
    },
  },
  {
    sessionId: "demo-joan",
    personaId: "joan",
    status: "completed",
    visualState: "blocked",
    eventCursor: 15,
    stepCount: 15,
    startedAt: now,
    finishedAt: "2026-07-11T16:32:44.000Z",
    agentViewUrl: "https://dashboard.eu.hcompany.ai/demo/joan",
    outcome: "failure",
    latestActionLabel: "Blocked by unlabeled calendar icon",
    errorCode: null,
    finding: {
      completion: "blocked",
      summary:
        "Joan could not continue because the next action was represented by an unlabeled icon.",
      evidence: ["Reached visit card", "Could not identify calendar icon action"],
      safeStopReached: false,
      frictionEvents: [
        {
          step: 8,
          category: "navigation",
          severity: 5,
          observation: "The only next action was an unlabeled calendar icon.",
          visibleEvidence:
            "Appointment card uses unlabeled calendar icon as the only booking action.",
          recommendation:
            "Add a visible 'Choose this appointment' label next to the calendar icon.",
          narratedObservation:
            "I see the little calendar, but I do not know if pressing it books something right away.",
          recovered: false,
        },
        {
          step: 12,
          category: "feedback",
          severity: 3,
          observation: "No confirmation appeared after Joan clicked the visit card.",
          visibleEvidence: "Visit card click changes border color without explanatory text.",
          recommendation:
            "Show explicit feedback such as 'Selected: routine visit' after choosing a card.",
          narratedObservation:
            "Something changed color, but I cannot tell whether I selected it or made a mistake.",
          recovered: false,
        },
      ],
    },
  },
];

export function createDemoRun(): RunSnapshot {
  const expectedBudgets = Object.fromEntries(
    demoAnalysis.personas.map((persona) => [
      persona.id,
      persona.expectedStepBudget,
    ]),
  );

  return {
    id: "demo-run",
    phase: "report",
    url: "https://mission-street-health.example",
    objective: "Book a doctor's visit",
    analysis: demoAnalysis,
    sessions: demoSessions,
    selectedPersonaId: "joan",
    report: calculateUsabilityReport(demoSessions, expectedBudgets),
    error: null,
    createdAt: now,
    updatedAt: "2026-07-11T16:33:06.000Z",
  };
}
