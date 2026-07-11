import { describe, expect, it } from "vitest";
import { canDispatchSuggestedPersonas } from "./persona-approval";

describe("persona suggestion approval", () => {
  it("blocks dispatch until the generated roster is accepted", () => {
    expect(
      canDispatchSuggestedPersonas({
        hasAnalysis: true,
        personasAccepted: false,
        authorized: true,
        loading: false,
        dispatching: false,
      }),
    ).toBe(false);
  });

  it("allows dispatch after acceptance when the test is authorized", () => {
    expect(
      canDispatchSuggestedPersonas({
        hasAnalysis: true,
        personasAccepted: true,
        authorized: true,
        loading: false,
        dispatching: false,
      }),
    ).toBe(true);
  });
});
