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
        onPrepareChange={() => undefined}
        preparedChange={null}
        preparingChange={false}
        proposal={null}
        repository={null}
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
        onPrepareChange={() => undefined}
        preparedChange={null}
        preparingChange={false}
        proposal={{
          mode: "codex",
          proposals: [{
            role: "fix-proposer",
            details: "Add explanatory copy directly above the identity fields.",
          }],
        }}
        repository={{
          id: "0123456789abcdef",
          name: "demo",
          branch: "fix/usability",
          commitSha: "abcdef1",
          relativeTarget: "demo",
          mode: "read-only",
        }}
      />,
    );

    expect(screen.getByText("Proposal ready")).toBeInTheDocument();
    expect(
      screen.getByText("Add explanatory copy directly above the identity fields."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare code change" })).toBeEnabled();
  });

  it("shows request failures beside the selected finding", () => {
    render(
      <ImprovementWorkspace
        candidate={candidate}
        error="Improvement proposal was not accepted."
        loading={false}
        onPrepareChange={() => undefined}
        preparedChange={null}
        preparingChange={false}
        proposal={null}
        repository={null}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Improvement proposal was not accepted.",
    );
  });

  it("shows validation checks and the real diff before claiming PR readiness", () => {
    render(
      <ImprovementWorkspace
        candidate={candidate}
        error={null}
        loading={false}
        onPrepareChange={() => undefined}
        preparingChange={false}
        proposal={{ mode: "codex", proposals: [] }}
        repository={{
          id: "0123456789abcdef",
          name: "demo",
          branch: "fix/usability",
          commitSha: "abcdef1",
          relativeTarget: "demo",
          mode: "read-only",
        }}
        preparedChange={{
          repository: {
            id: "0123456789abcdef",
            name: "demo",
            branch: "fix/usability",
            commitSha: "abcdef1",
            relativeTarget: "demo",
            mode: "read-only",
          },
          diff: "diff --git a/demo/app/page.tsx b/demo/app/page.tsx",
          checks: [{ command: "pnpm build", passed: true, output: "passed" }],
          readyForPr: true,
        }}
      />,
    );

    expect(screen.getByText("PR ready")).toBeInTheDocument();
    expect(screen.getByText("pnpm build")).toBeInTheDocument();
    expect(screen.getByText(/diff --git a\/demo\/app\/page.tsx/)).toBeInTheDocument();
  });
});
