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

      <BrowserCard className="journey-card-search" title="Search">
        <div className="mock-search-brand">Search</div>
        <div className="mock-search-input">routine doctor visit</div>
        <div className="mock-lines"><i /><i /><i /></div>
      </BrowserCard>

      <BrowserCard className="journey-card-options" title="Visit options">
        <p className="mock-label">Choose your care</p>
        <div className="mock-option-row">
          <i /><i className="selected" /><i />
        </div>
        <div className="mock-button">Compare visits</div>
      </BrowserCard>

      <BrowserCard className="journey-card-form" title="Appointment details">
        <p className="mock-label">Care modality</p>
        <div className="mock-input">Routine care</div>
        <div className="mock-button">Continue</div>
        <motion.div
          aria-hidden="true"
          className="click-ripple"
          animate={reduceMotion ? undefined : { scale: [0.5, 1.7], opacity: [0.9, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.1 }}
        />
        <MousePointer2 className="mock-cursor" size={22} />
      </BrowserCard>

      <BrowserCard className="journey-card-blocked" title="Insurance">
        <div className="mock-warning"><AlertTriangle size={13} /> Why do we need this?</div>
        <div className="mock-input">Insurance provider</div>
        <div className="mock-muted-button">Required to continue</div>
      </BrowserCard>

      <BrowserCard className="journey-card-success" title="Review visit">
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
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className: string;
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
      <div className="browser-content">{children}</div>
    </motion.article>
  );
}

function formatState(state: VisualAgentState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}
