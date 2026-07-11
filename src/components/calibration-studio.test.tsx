import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalibrationStudio } from "./calibration-studio";

describe("CalibrationStudio", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires both consent acknowledgements before recording", () => {
    render(<CalibrationStudio />);

    expect(screen.getByRole("button", { name: /start recording/i })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/tester consented/i));
    expect(screen.getByRole("button", { name: /start recording/i })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/behavioral research use/i));
    expect(screen.getByRole("button", { name: /start recording/i })).toBeEnabled();
  });

  it("uploads a recording, reviews rules, and explicitly approves the proxy", async () => {
    const now = new Date().toISOString();
    const session = {
      id: "cal-1",
      testerName: "Margaret",
      targetUrl: "https://example.com",
      objective: "Reach checkout review.",
      consentedAt: now,
      status: "needs_review",
      source: "heuristic",
      transcript: null,
      media: { filename: "cal-1.webm", mimeType: "video/webm", byteLength: 9 },
      evidence: [],
      behaviorRules: ["Pause at icon-only controls."],
      trustBoundaries: ["Stop before placing an order."],
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: session }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { ...session, status: "approved", approvedAt: now },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<CalibrationStudio />);

    fireEvent.change(screen.getByLabelText(/tester name/i), {
      target: { value: "Margaret" },
    });
    fireEvent.change(screen.getByLabelText(/product url/i), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText(/test objective/i), {
      target: { value: "Reach checkout review." },
    });
    fireEvent.change(screen.getByLabelText(/researcher notes/i), {
      target: { value: "The tester paused at the cart icon before continuing." },
    });
    fireEvent.click(screen.getByLabelText(/tester consented/i));
    fireEvent.click(screen.getByLabelText(/behavioral research use/i));
    fireEvent.change(screen.getByLabelText(/upload recording/i), {
      target: {
        files: [new File(["recording"], "session.webm", { type: "video/webm" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze session/i }));

    expect(await screen.findByText(/review the behavioral proxy/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve behavioral proxy/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("link", { name: /open in grannysmith lab/i })).toHaveAttribute(
      "href",
      expect.stringContaining("calibration=cal-1"),
    );
  });
});
