"use client";

import { Play, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function DemoLaunchForm() {
  const [hasLaunched, setHasLaunched] = useState(false);

  function releasePanel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasLaunched(true);
    window.dispatchEvent(new Event("grannysmith:release-panel"));
    document.querySelector<HTMLElement>(".journey-stage")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }

  return (
    <form className={`hero-form ${hasLaunched ? "has-launched" : ""}`} id="start" onSubmit={releasePanel}>
      <label htmlFor="target-url">Authorized product URL</label>
      <div className="hero-form-row">
        <input
          id="target-url"
          defaultValue="https://demo-health.example"
          type="url"
          required
        />
        <button type="submit">
          {hasLaunched ? <RotateCcw size={17} /> : <Play size={17} />}
          {hasLaunched ? "Restart trajectory" : "Release the panel"}
        </button>
      </div>
      <p><ShieldCheck size={14} /> Only test sites you own or have permission to evaluate.</p>
      <div className="launch-status" aria-live="polite">
        {hasLaunched && <span><i /> Panel released · four agents observing the demo</span>}
      </div>
    </form>
  );
}
