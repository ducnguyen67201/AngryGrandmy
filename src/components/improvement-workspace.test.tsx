import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImprovementWorkspace } from "./improvement-workspace";

const candidate = {
  personaId: "sam",
  sessionId: "session-sam",
  friction: {
    step: 7,
    category: "trust" as const,
    severity: 5 as const,
    observation: "Sam did not understand why sensitive data was requested.",
    visibleEvidence: "The form asks for identity details without an explanation.",
    recommendation: "Explain why the information is needed before requesting it.",
    narratedObservation: "Why do they need this?",
    recovered: false,
  },
};

describe("ImprovementWorkspace", () => {
  it("shows the selected evidence immediately while the proposal is prepared", () => {
    render(
      <ImprovementWorkspace
        candidate={candidate}
        error={null}
        loading
        proposal={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "Improvement workspace" })).toBeInTheDocument();
    expect(screen.getByText(candidate.friction.recommendation)).toBeInTheDocument();
    expect(screen.getByText(candidate.friction.visibleEvidence)).toBeInTheDocument();
    expect(screen.getByText("Reading the connected codebase…")).toBeInTheDocument();
  });

  it("renders returned implementation guidance instead of hiding it in the response", () => {
    render(
      <ImprovementWorkspace
        candidate={candidate}
        error={null}
        loading={false}
        proposal={{
          mode: "codex",
          proposals: [{
            role: "fix-proposer",
            details: "Add explanatory copy directly above the identity fields.",
          }],
        }}
      />,
    );

    expect(screen.getByText("Proposal ready")).toBeInTheDocument();
    expect(
      screen.getByText("Add explanatory copy directly above the identity fields."),
    ).toBeInTheDocument();
  });

  it("shows request failures beside the selected finding", () => {
    render(
      <ImprovementWorkspace
        candidate={candidate}
        error="Improvement proposal was not accepted."
        loading={false}
        proposal={null}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Improvement proposal was not accepted.",
    );
  });
});
