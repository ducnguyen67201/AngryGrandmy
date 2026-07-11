import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonaBuilder } from "./persona-builder";

describe("PersonaBuilder", () => {
  it("offers one-click persona suggestions for common target users", () => {
    render(<PersonaBuilder disabled={false} onCreate={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /grandma new to apps/i }));

    expect(screen.getByLabelText(/persona name/i)).toHaveValue("Margaret");
    expect(screen.getByLabelText(/describe your persona/i)).toHaveValue(
      "An older adult who is new to apps, reads every label carefully, and worries that a click may commit to something.",
    );
    expect(screen.getByLabelText(/digital confidence/i)).toHaveValue("low");
  });

  it("collects a persona description and creates a previewable tester", () => {
    const onCreate = vi.fn();
    render(<PersonaBuilder disabled={false} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/persona name/i), {
      target: { value: "Alex" },
    });
    fireEvent.change(screen.getByLabelText(/describe your persona/i), {
      target: {
        value:
          "A color-blind parent shopping on mobile who distrusts subscriptions.",
      },
    });
    fireEvent.change(screen.getByLabelText(/digital confidence/i), {
      target: { value: "medium" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create persona/i }));

    expect(onCreate).toHaveBeenCalledWith({
      displayName: "Alex",
      description:
        "A color-blind parent shopping on mobile who distrusts subscriptions.",
      digitalConfidence: "medium",
    });
    expect(screen.getByText(/alex is ready to join the panel/i)).toBeInTheDocument();
  });

  it("requires a generated panel before persona creation", () => {
    render(<PersonaBuilder disabled onCreate={vi.fn()} />);

    expect(screen.getByRole("button", { name: /create persona/i })).toBeDisabled();
    expect(screen.getByText(/generate the panel first/i)).toBeInTheDocument();
  });
});
