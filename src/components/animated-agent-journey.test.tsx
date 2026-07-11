import { render, screen } from "@testing-library/react";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { AnimatedAgentJourney } from "./animated-agent-journey";

describe("AnimatedAgentJourney", () => {
  it("presents the live trajectory as an accessible product visualization", () => {
    render(<AnimatedAgentJourney snapshot={createDemoRun()} />);

    expect(
      screen.getByRole("region", { name: /live synthetic usability trajectory/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Live trajectory")).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 7")).toBeInTheDocument();
    expect(screen.getByText("Four personas observing")).toBeInTheDocument();
  });

  it("identifies every persona and exposes their current result", () => {
    render(<AnimatedAgentJourney snapshot={createDemoRun()} />);

    expect(screen.getByText("Linda")).toBeInTheDocument();
    expect(screen.getByText("Rosa")).toBeInTheDocument();
    expect(screen.getByText("Mei")).toBeInTheDocument();
    expect(screen.getByText("Joan")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });
});
