import { render, screen } from "@testing-library/react";
import { act, createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { AnimatedAgentJourney } from "./animated-agent-journey";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AnimatedAgentJourney", () => {
  it("presents the live trajectory as an accessible product visualization", () => {
    render(createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }));

    expect(
      screen.getByRole("region", { name: /live synthetic usability trajectory/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Live trajectory")).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 8")).toBeInTheDocument();
    expect(screen.getByText("Four personas observing")).toBeInTheDocument();
    expect(screen.getByText("Collect training episode")).toBeInTheDocument();
  });

  it("identifies every persona and exposes their current result", () => {
    render(createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }));

    expect(screen.getByText("Linda")).toBeInTheDocument();
    expect(screen.getByText("Rosa")).toBeInTheDocument();
    expect(screen.getByText("Mei")).toBeInTheDocument();
    expect(screen.getByText("Joan")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked")).not.toHaveLength(0);
  });

  it("advances the visible step while motion is enabled", () => {
    vi.useFakeTimers();
    render(createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }));

    act(() => vi.advanceTimersByTime(4200));

    expect(screen.getByText("Step 5 of 8")).toBeInTheDocument();
  });

  it("keeps the initial step still when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.useFakeTimers();
    render(createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }));

    act(() => vi.advanceTimersByTime(4800));

    expect(screen.getByText("Step 4 of 8")).toBeInTheDocument();
  });

  it("falls back to queued personas when live session data is unavailable", () => {
    const snapshot = createDemoRun();
    render(
      createElement(AnimatedAgentJourney, {
        snapshot: { ...snapshot, sessions: [] },
      }),
    );

    expect(screen.getAllByText("Queued")).toHaveLength(4);
  });

  it("shows an independent computer-use agent inside every browser window", () => {
    render(createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }));

    expect(screen.getAllByLabelText(/computer-use agent/i)).toHaveLength(6);
    expect(screen.getByText("Scanning results")).toBeInTheDocument();
    expect(screen.getByText("Comparing options")).toBeInTheDocument();
    expect(screen.getByText("Entering details")).toBeInTheDocument();
    expect(screen.getByText("Waiting for context")).toBeInTheDocument();
    expect(screen.getByText("Reviewing summary")).toBeInTheDocument();
    expect(screen.getByText("Collecting dataset")).toBeInTheDocument();
  });

  it("keeps a stable route-particle tree when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { container } = render(
      createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }),
    );

    expect(container.querySelectorAll(".route-energy-particle")).toHaveLength(2);
    expect(container.querySelector("animateMotion")).not.toBeInTheDocument();
  });

  it("restarts the trajectory when the demo panel is released", () => {
    render(createElement(AnimatedAgentJourney, { snapshot: createDemoRun() }));

    act(() => window.dispatchEvent(new Event("grannysmith:release-panel")));

    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
  });
});
