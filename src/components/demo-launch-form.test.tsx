import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoLaunchForm } from "./demo-launch-form";

describe("DemoLaunchForm", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("releases the deterministic panel demo and announces its state", () => {
    const releaseListener = vi.fn();
    window.addEventListener("grannysmith:release-panel", releaseListener);
    document.body.innerHTML = '<section class="journey-stage"></section>';
    render(<DemoLaunchForm />);

    fireEvent.click(screen.getByRole("button", { name: /release the panel/i }));

    expect(releaseListener).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /restart trajectory/i })).toBeInTheDocument();
    expect(screen.getByText(/four agents observing the demo/i)).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    window.removeEventListener("grannysmith:release-panel", releaseListener);
  });
});
