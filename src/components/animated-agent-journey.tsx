"use client";

import { AlertTriangle, Check, Clock3, Database, MousePointer2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { RunSnapshot, VisualAgentState } from "@/lib/schemas/run";

const steps = [
  "Open product site",
  "Scan visit options",
  "Compare care types",
  "Choose routine visit",
  "Review insurance step",
  "Check appointment details",
  "Reach safe stop",
  "Collect training episode",
] as const;

const personaColors = ["#b890ff", "#55d8c1", "#ffbb66", "#ff756d"];

const actorAccents = {
  linda: "#b890ff",
  rosa: "#55d8c1",
  mei: "#ffbb66",
  joan: "#ff756d",
} as const;

export function AnimatedAgentJourney({ snapshot }: { snapshot: RunSnapshot }) {
  const reduceMotion = useReducedMotionPreference();
  const [activeStep, setActiveStep] = useState(3);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % steps.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    const restartTrajectory = () => setActiveStep(0);
    window.addEventListener("grannysmith:release-panel", restartTrajectory);
    return () => window.removeEventListener("grannysmith:release-panel", restartTrajectory);
  }, []);

  const sessionsByPersona = new Map(
    snapshot.sessions.map((session) => [session.personaId, session]),
  );
  const personas = snapshot.analysis?.personas ?? [];

  return (
    <section
      aria-label="Live synthetic usability trajectory"
      className="journey-stage"
    >
      <div className="journey-aurora" aria-hidden="true" />
      <div className="journey-grid" aria-hidden="true" />
      <div className="journey-scan" aria-hidden="true" />
      <div className="route-energy-particle route-energy-main" aria-hidden="true" />
      <div className="route-energy-particle route-energy-warn" aria-hidden="true" />

      <div className="journey-toolbar">
        <div>
          <p className="journey-kicker">
            <span className="live-dot" /> Live trajectory
          </p>
          <p className="journey-product">Mission Street Health</p>
        </div>
        <div className="journey-counter">
          <span>Step {activeStep + 1} of {steps.length}</span>
          <span className="journey-counter-line">
            <i style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
          </span>
        </div>
      </div>

      <svg
        aria-hidden="true"
        className="journey-routes"
        viewBox="0 0 800 610"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="route-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="route-main" x1="0" x2="1">
            <stop offset="0" stopColor="#55d8c1" />
            <stop offset="0.52" stopColor="#65a8ff" />
            <stop offset="1" stopColor="#b890ff" />
          </linearGradient>
          <linearGradient id="route-warn" x1="0" x2="1">
            <stop offset="0" stopColor="#ffbb66" />
            <stop offset="1" stopColor="#ff756d" />
          </linearGradient>
          <path id="main-route" d="M102 190 C190 190 182 305 300 300 S425 190 510 205 S560 330 625 342 S700 445 684 505" />
          <path id="warn-route" d="M300 300 C322 390 210 390 223 475 S330 532 407 502" />
        </defs>

        <g className="route-dashes">
          <use href="#main-route" className="route-shadow" />
          <use href="#main-route" className="route-line route-line-main" />
          <use href="#warn-route" className="route-shadow" />
          <use href="#warn-route" className="route-line route-line-warn" />
        </g>

        {[
          [102, 190],
          [300, 300],
          [510, 205],
          [625, 342],
          [684, 505],
          [223, 475],
        ].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`}>
            <circle className="route-node-pulse" cx={cx} cy={cy} r="12" />
            <circle className="route-node" cx={cx} cy={cy} r={index === 1 ? 7 : 5} />
          </g>
        ))}
      </svg>

      <div className="observation-prism" aria-hidden="true">
        <i className="prism-orbit prism-orbit-outer" />
        <i className="prism-orbit prism-orbit-inner" />
        <span className="prism-core" />
        <b>Friction<br />captured</b>
      </div>

      <BrowserCard
        activity="Scanning results"
        actor="Rosa"
        accent={actorAccents.rosa}
        active={activeStep === 0}
        className="journey-card-search"
        cursorPath={{ x: [18, 72, 46, 80, 18], y: [52, 52, 72, 82, 52] }}
        delay={0}
        mode="scan"
        title="Search"
      >
        <div className="mock-search-brand">Search</div>
        <div className="mock-search-input">routine doctor visit</div>
        <div className="mock-lines"><i /><i /><i /></div>
      </BrowserCard>

      <BrowserCard
        activity="Comparing options"
        actor="Linda"
        accent={actorAccents.linda}
        active={activeStep > 0 && activeStep < 4}
        className="journey-card-options"
        cursorPath={{ x: [18, 48, 76, 48, 18], y: [62, 62, 62, 84, 62] }}
        delay={0.8}
        mode="click"
        title="Visit options"
      >
        <p className="mock-label">Choose your care</p>
        <div className="mock-option-row">
          <i /><i className="selected" /><i />
        </div>
        <div className="mock-button">Compare visits</div>
      </BrowserCard>

      <BrowserCard
        activity="Entering details"
        actor="Mei"
        accent={actorAccents.mei}
        active={activeStep === 5}
        className="journey-card-form"
        cursorPath={{ x: [76, 45, 30, 72, 76], y: [78, 50, 50, 79, 78] }}
        delay={1.6}
        mode="type"
        title="Appointment details"
      >
        <p className="mock-label">Care modality</p>
        <div className="mock-input">Routine care</div>
        <div className="mock-button">Continue</div>
      </BrowserCard>

      <BrowserCard
        activity="Waiting for context"
        actor="Joan"
        accent={actorAccents.joan}
        active={activeStep === 4}
        className="journey-card-blocked"
        cursorPath={{ x: [72, 34, 34, 64, 72], y: [72, 48, 48, 72, 72] }}
        delay={2.4}
        mode="pause"
        title="Insurance"
      >
        <div className="mock-warning"><AlertTriangle size={13} /> Why do we need this?</div>
        <div className="mock-input">Insurance provider</div>
        <div className="mock-muted-button">Required to continue</div>
      </BrowserCard>

      <BrowserCard
        activity="Reviewing summary"
        actor="Rosa"
        accent={actorAccents.rosa}
        active={activeStep === 6}
        className="journey-card-success"
        cursorPath={{ x: [78, 24, 62, 74, 78], y: [74, 48, 58, 80, 74] }}
        delay={3.2}
        mode="review"
        title="Review visit"
      >
        <div className="mock-success"><Check size={13} /> Safe stop reached</div>
        <div className="mock-lines"><i /><i /><i /></div>
        <div className="mock-button">Review details</div>
      </BrowserCard>

      <BrowserCard
        activity="Collecting dataset"
        actor="GS"
        accent="#65d7f1"
        active={activeStep === 7}
        className="journey-card-dataset"
        cursorPath={{ x: [18, 34, 66, 80, 18], y: [72, 42, 42, 72, 72] }}
        delay={0.2}
        mode="collect"
        title="Training episode"
      >
        <div className="mock-dataset-heading"><Database size={12} /> Model-ready row</div>
        <div className="mock-dataset-grid">
          <span>screen</span>
          <span>action</span>
          <span>outcome</span>
          <span>ux label</span>
        </div>
        <div className="mock-dataset-badge">6 training points</div>
      </BrowserCard>

      <aside
        className={`persona-observation ${activeStep === 4 ? "is-active" : ""}`}
      >
        <span className="persona-avatar persona-avatar-joan">J</span>
        <div>
          <div className="observation-heading">
            <strong>Joan’s observation</strong>
            <span>Blocked</span>
          </div>
          <p>“I see the calendar, but I don’t know if pressing it books something.”</p>
        </div>
      </aside>

      <aside className="live-steps" aria-label="Current trajectory steps">
        <div className="live-steps-heading">
          <span>Live steps</span>
          <Clock3 size={14} />
        </div>
        <ol>
          {steps.map((step, index) => (
            <li
              className={index === activeStep ? "is-active" : index < activeStep ? "is-done" : ""}
              key={step}
            >
              <span>{index < activeStep ? <Check size={11} /> : index + 1}</span>
              <b>{step}</b>
            </li>
          ))}
        </ol>
      </aside>

      <div className="persona-dock">
        <span className="persona-dock-label">
          {personas.length === 4 ? "Four" : personas.length} personas observing
        </span>
        <div className="persona-list">
          {personas.map((persona, index) => {
            const state = sessionsByPersona.get(persona.id)?.visualState ?? "queued";
            return (
              <div className="persona-chip" key={persona.id}>
                <span
                  className="persona-avatar"
                  style={{ background: personaColors[index % personaColors.length] }}
                >
                  {persona.displayName.charAt(0)}
                </span>
                <span>
                  <b>{persona.displayName}</b>
                  <small>{formatState(state)}</small>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="stage-telemetry" aria-hidden="true">
        <span><i /> Vision online</span>
        <span>5 screenshots/min</span>
        <span>Permission verified</span>
      </div>
    </section>
  );
}

function BrowserCard({
  accent,
  active,
  activity,
  actor,
  children,
  className,
  cursorPath,
  delay,
  mode,
  title,
}: {
  accent: string;
  active: boolean;
  activity: string;
  actor: string;
  children: React.ReactNode;
  className: string;
  cursorPath: { x: number[]; y: number[] };
  delay: number;
  mode: "scan" | "click" | "type" | "pause" | "review" | "collect";
  title: string;
}) {
  return (
    <article
      className={`journey-browser-card ${className} ${active ? "is-active" : ""}`}
      style={{ "--actor-accent": accent } as React.CSSProperties}
    >
      <div className="browser-chrome">
        <span /><span /><span />
        <b>{title}</b>
      </div>
      <div className="browser-content">
        {children}
        <ComputerUseActor
          activity={activity}
          actor={actor}
          active={active}
          cursorPath={cursorPath}
          delay={delay}
          mode={mode}
        />
      </div>
    </article>
  );
}

function ComputerUseActor({
  activity,
  actor,
  active,
  cursorPath,
  delay,
  mode,
}: {
  activity: string;
  actor: string;
  active: boolean;
  cursorPath: { x: number[]; y: number[] };
  delay: number;
  mode: "scan" | "click" | "type" | "pause" | "review" | "collect";
}) {
  const startX = `${cursorPath.x[0]}%`;
  const startY = `${cursorPath.y[0]}%`;
  const cursorStyle = {
    left: startX,
    top: startY,
    "--cursor-x-0": startX,
    "--cursor-y-0": startY,
    "--cursor-x-1": `${cursorPath.x[1]}%`,
    "--cursor-y-1": `${cursorPath.y[1]}%`,
    "--cursor-x-2": `${cursorPath.x[2]}%`,
    "--cursor-y-2": `${cursorPath.y[2]}%`,
    "--cursor-x-3": `${cursorPath.x[3]}%`,
    "--cursor-y-3": `${cursorPath.y[3]}%`,
    "--cursor-delay": `${delay}s`,
    "--cursor-duration": mode === "pause" ? "6.4s" : "5.2s",
  } as React.CSSProperties;

  return (
    <>
      <div className={`computer-use-status computer-use-${mode} ${active ? "is-active" : ""}`}>
        <span />
        {activity}
      {(mode === "type" || mode === "collect") && <i aria-hidden="true">•••</i>}
      </div>
      {mode === "scan" && <div aria-hidden="true" className="agent-scan-line" />}
      <div
        aria-label={`Computer-use agent ${actor}: ${activity}`}
        className={`in-window-agent in-window-agent-${mode} ${active ? "is-active" : ""}`}
        style={cursorStyle}
      >
        <span aria-hidden="true" className="in-window-agent-label">{actor} · live</span>
        <span aria-hidden="true" className="cursor-trail cursor-trail-one" />
        <span aria-hidden="true" className="cursor-trail cursor-trail-two" />
        <span aria-hidden="true" className="in-window-click" />
        <MousePointer2 aria-hidden="true" size={14} strokeWidth={2.4} />
      </div>
    </>
  );
}

function formatState(state: VisualAgentState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function useReducedMotionPreference(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return reduceMotion;
}
