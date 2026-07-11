"use client";

import { Sparkles, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { PersonaScenario } from "@/lib/schemas/run";

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

  return (
    <section className="rounded-lg border border-grape/25 bg-grape/5 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-grape text-white">
          <UserPlus size={18} />
        </span>
        <div>
          <p className="font-black">Create your own persona</p>
          <p className="mt-1 text-sm leading-5 text-ink/60">
            Describe a real perspective. We’ll structure it and pass it to an H Company agent.
          </p>
        </div>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr]">
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-ink/55">
            Persona name
            <input
              className="min-h-10 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium normal-case tracking-normal text-ink"
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Alex"
              value={displayName}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-ink/55">
            Digital confidence
            <select
              className="min-h-10 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium normal-case tracking-normal text-ink"
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
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-ink/55">
          Describe your persona
          <textarea
            className="min-h-24 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium leading-6 normal-case tracking-normal text-ink"
            maxLength={1200}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: A color-blind parent shopping on a phone who distrusts surprise subscriptions."
            value={description}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink/50" aria-live="polite">
            {disabled
              ? "Generate the panel first, then add your persona."
              : createdName
                ? `${createdName} is ready to join the panel.`
                : "One custom persona can join the four generated testers."}
          </p>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-grape px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              disabled || !displayName.trim() || description.trim().length < 12
            }
            type="submit"
          >
            <Sparkles size={15} /> Create persona
          </button>
        </div>
      </form>
    </section>
  );
}
