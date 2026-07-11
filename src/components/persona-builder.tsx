"use client";

import { ChevronDown, Sparkles, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { PersonaScenario } from "@/lib/schemas/run";

const PERSONA_SUGGESTIONS: Array<PersonaDraft & { label: string }> = [
  {
    label: "Grandma new to apps",
    displayName: "Margaret",
    description:
      "An older adult who is new to apps, reads every label carefully, and worries that a click may commit to something.",
    digitalConfidence: "low",
  },
  {
    label: "Busy parent on mobile",
    displayName: "Sam",
    description:
      "A busy parent using one hand on a phone who scans quickly and needs the next action to be obvious.",
    digitalConfidence: "medium",
  },
  {
    label: "Screen reader user",
    displayName: "Jordan",
    description:
      "A screen reader user who depends on descriptive labels, logical focus order, and clear form feedback.",
    digitalConfidence: "high",
  },
];

export type PersonaDraft = {
  displayName: string;
  description: string;
  digitalConfidence: PersonaScenario["digitalConfidence"];
};

export function PersonaBuilder({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (draft: PersonaDraft) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [digitalConfidence, setDigitalConfidence] =
    useState<PersonaDraft["digitalConfidence"]>("low");
  const [createdName, setCreatedName] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = {
      displayName: displayName.trim(),
      description: description.trim(),
      digitalConfidence,
    };
    if (disabled || !draft.displayName || draft.description.length < 12) return;

    onCreate(draft);
    setCreatedName(draft.displayName);
  }

  function applySuggestion(suggestion: PersonaDraft) {
    if (disabled) return;
    setDisplayName(suggestion.displayName);
    setDescription(suggestion.description);
    setDigitalConfidence(suggestion.digitalConfidence);
    setCreatedName(null);
  }

  return (
    <details className="custom-persona">
      <summary>
        <span><UserPlus size={16} /></span>
        <b>Add someone specific</b>
        <small>e.g. my grandma</small>
        <ChevronDown size={15} />
      </summary>
      <div className="custom-persona-body">
      <div className="custom-suggestions" aria-label="Persona suggestions">
        {PERSONA_SUGGESTIONS.map((suggestion) => (
          <button
            className="custom-suggestion"
            disabled={disabled}
            key={suggestion.label}
            onClick={() => applySuggestion(suggestion)}
            type="button"
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      <form className="custom-persona-form" onSubmit={handleSubmit}>
        <div className="custom-persona-fields">
          <label>
            Persona name
            <input
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Alex"
              value={displayName}
            />
          </label>
          <label>
            Digital confidence
            <select
              onChange={(event) =>
                setDigitalConfidence(event.target.value as PersonaDraft["digitalConfidence"])
              }
              value={digitalConfidence}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <label>
          Describe your persona
          <textarea
            maxLength={1200}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Who are they, what device do they use, and what makes them hesitate?"
            value={description}
          />
        </label>
        <div className="custom-persona-action">
          <p aria-live="polite">
            {disabled
              ? "Generate the panel first, then add your persona."
              : createdName
                ? `${createdName} is ready to join the panel.`
                : "This persona will join the suggested testers."}
          </p>
          <button
            disabled={
              disabled || !displayName.trim() || description.trim().length < 12
            }
            type="submit"
          >
            <Sparkles size={15} /> Create persona
          </button>
        </div>
      </form>
      </div>
    </details>
  );
}
