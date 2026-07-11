"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, Clock3, MousePointer2 } from "lucide-react";
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
] as const;

const personaColors = ["#b890ff", "#55d8c1", "#ffbb66", "#ff756d"];

export function AnimatedAgentJourney({ snapshot }: { snapshot: RunSnapshot }) {
  const reduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(3);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % steps.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

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

        {!reduceMotion && (
          <>
            <circle r="5" fill="#d8fff5" filter="url(#route-glow)">
              <animateMotion dur="7s" repeatCount="indefinite">
                <mpath href="#main-route" />
              </animateMotion>
            </circle>
            <circle r="5" fill="#fff1c4" filter="url(#route-glow)">
              <animateMotion dur="5.2s" begin="-2s" repeatCount="indefinite">
                <mpath href="#warn-route" />
              </animateMotion>
            </circle>
          </>
        )}

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

      <BrowserCard
        activity="Scanning results"
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

      <motion.aside
        className="persona-observation"
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="persona-avatar persona-avatar-joan">J</span>
        <div>
          <div className="observation-heading">
            <strong>Joan’s observation</strong>
            <span>Blocked</span>
          </div>
          <p>“I see the calendar, but I don’t know if pressing it books something.”</p>
        </div>
      </motion.aside>

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
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.b
                  key={`${step}-${index === activeStep}`}
                  initial={{ opacity: 0.55 }}
                  animate={{ opacity: 1 }}
                >
                  {step}
                </motion.b>
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </aside>

      <div className="persona-dock">
        <span className="persona-dock-label">Four personas observing</span>
        <div className="persona-list">
          {personas.map((persona, index) => {
            const state = sessionsByPersona.get(persona.id)?.visualState ?? "queued";
            return (
              <div className="persona-chip" key={persona.id}>
                <span
                  className="persona-avatar"
                  style={{ background: personaColors[index] }}
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
    </section>
  );
}

function BrowserCard({
  activity,
  children,
  className,
  cursorPath,
  delay,
  mode,
  title,
}: {
  activity: string;
  children: React.ReactNode;
  className: string;
  cursorPath: { x: number[]; y: number[] };
  delay: number;
  mode: "scan" | "click" | "type" | "pause" | "review";
  title: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={`journey-browser-card ${className}`}
      animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="browser-chrome">
        <span /><span /><span />
        <b>{title}</b>
      </div>
      <div className="browser-content">
        {children}
        <ComputerUseActor
          activity={activity}
          cursorPath={cursorPath}
          delay={delay}
          mode={mode}
        />
      </div>
    </motion.article>
  );
}

function ComputerUseActor({
  activity,
  cursorPath,
  delay,
  mode,
}: {
  activity: string;
  cursorPath: { x: number[]; y: number[] };
  delay: number;
  mode: "scan" | "click" | "type" | "pause" | "review";
}) {
  const reduceMotion = useReducedMotion();
  const startX = `${cursorPath.x[0]}%`;
  const startY = `${cursorPath.y[0]}%`;

  return (
    <>
      <div className={`computer-use-status computer-use-${mode}`}>
        <span />
        {activity}
        {mode === "type" && <i aria-hidden="true">•••</i>}
      </div>
      {mode === "scan" && <div aria-hidden="true" className="agent-scan-line" />}
      <motion.div
        aria-label={`Computer-use agent: ${activity}`}
        className={`in-window-agent in-window-agent-${mode}`}
        style={{ left: startX, top: startY }}
        animate={
          reduceMotion
            ? undefined
            : {
                left: cursorPath.x.map((value) => `${value}%`),
                top: cursorPath.y.map((value) => `${value}%`),
              }
        }
        transition={{
          delay,
          duration: mode === "pause" ? 6.4 : 5.2,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.3, 0.52, 0.78, 1],
        }}
      >
        <span aria-hidden="true" className="in-window-click" />
        <MousePointer2 aria-hidden="true" size={14} strokeWidth={2.4} />
      </motion.div>
    </>
  );
}

function formatState(state: VisualAgentState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}
