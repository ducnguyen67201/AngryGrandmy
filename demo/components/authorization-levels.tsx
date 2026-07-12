'use client';

import { useId, useState } from 'react';
import { LEVEL_GLYPHS } from '@/lib/dots';
import { DotArt } from './dot-art';
import { Eyebrow } from './how';

type Verdict = 'allow' | 'rewrite' | 'block' | 'escalate';

interface Level {
  code: string;
  name: string;
  glyph: keyof typeof LEVEL_GLYPHS;
  tag: string;
  policy: string;
  example: string;
  note: string;
  chips: Array<{ v: Verdict; label: string }>;
}

const LEVELS: Level[] = [
  {
    code: 'L0',
    name: 'Observe',
    glyph: 'observe',
    tag: 'Shadow mode',
    policy: 'See what your agent would spend before you let it.',
    example: 'mode: observe · sign every proposed action · enforce: none',
    note: 'Every proposed action is logged and signed. Nothing is enforced yet, so you can watch the agent spend on paper before a single real dollar is at risk.',
    chips: [{ v: 'allow', label: 'LOGGED' }],
  },
  {
    code: 'L1',
    name: 'Cap',
    glyph: 'cap',
    tag: 'Hard limits fire',
    policy: 'Per-day, per-merchant, and per-action dollar caps.',
    example: 'cap: $5,000/day · $500/cart · over-cap → cap or block',
    note: 'Limits are enforced automatically. An over-cap charge is capped down to the limit or blocked outright, with no human in the loop.',
    chips: [
      { v: 'allow', label: 'ALLOW' },
      { v: 'rewrite', label: 'CAP' },
      { v: 'block', label: 'BLOCK' },
    ],
  },
  {
    code: 'L2',
    name: 'Approve',
    glyph: 'approve',
    tag: 'Escalation required',
    policy: 'Named action classes pause for a human signature.',
    example: 'escalate: refund > $200 · new vendor · any wire',
    note: 'The routine spend flows. A refund over $200, a first-time vendor, or a wire pauses and routes to a named person before it can fire.',
    chips: [
      { v: 'allow', label: 'ALLOW' },
      { v: 'escalate', label: 'HOLD' },
    ],
  },
  {
    code: 'L3',
    name: 'Autonomous',
    glyph: 'autonomous',
    tag: 'Runs within policy',
    policy: 'The agent runs free inside signed policy.',
    example: 'autonomous: within signed policy · every action hash-chained',
    note: 'Full autonomy inside the boundary you signed. There is still no unsigned action: each decision is hash-chained into a tamper-evident trail.',
    chips: [
      { v: 'allow', label: 'ALLOW' },
      { v: 'block', label: 'BLOCK' },
    ],
  },
];

const LOOP_STEPS = [
  { n: '01', label: 'propose', sub: 'agent drafts the action' },
  { n: '02', label: 'check', sub: 'policy scored in <10ms' },
  { n: '03', label: 'verdict', sub: 'allow · cap · block · escalate' },
  { n: '04', label: 'sign', sub: 'hash-chained receipt' },
] as const;

export function AuthorizationLevels() {
  const [active, setActive] = useState(1); // default to L1 · Cap, the everyday setting
  const panelId = useId();

  return (
    <section id="loop" aria-labelledby="levels-heading" className="section levels-section">
      <div className="levels-head">
        <Eyebrow>02 · Authorization levels</Eyebrow>
        <h2 id="levels-heading" className="section-title max-w-2xl">
          Give your agent authority one level at a time.
        </h2>
        <p className="section-copy mt-4 max-w-xl">
          Trust is granted in levels, not all at once. Teams start in observe mode, add caps, then
          hand over more only once the trail proves it is safe. Turn the dial when you are ready.
        </p>
      </div>

      <div
        className="levels-ladder"
        role="tablist"
        aria-label="Agent authorization levels"
        aria-orientation="vertical"
      >
        <span className="levels-spine" aria-hidden="true">
          <span
            className="levels-spine-fill"
            style={{ height: `${(active / (LEVELS.length - 1)) * 100}%` }}
          />
        </span>

        {LEVELS.map((level, i) => {
          const isActive = i === active;
          const earned = i <= active;
          return (
            <div key={level.code} className={`level ${isActive ? 'level-active' : ''}`}>
              <button
                type="button"
                role="tab"
                id={`${panelId}-tab-${i}`}
                aria-selected={isActive}
                aria-controls={isActive ? `${panelId}-panel` : undefined}
                onClick={() => setActive(i)}
                className="level-row"
              >
                <span
                  className={`level-node ${earned ? 'level-node-on' : ''}`}
                  aria-hidden="true"
                />
                <span className="level-glyph" aria-hidden="true">
                  <DotArt layers={LEVEL_GLYPHS[level.glyph]} />
                </span>
                <span className="level-code">{level.code}</span>
                <span className="level-head">
                  <span className="level-name">{level.name}</span>
                  <span className="level-tag">{level.tag}</span>
                </span>
                <span className="level-policy">{level.policy}</span>
              </button>

              {isActive && (
                <div
                  id={`${panelId}-panel`}
                  role="tabpanel"
                  aria-labelledby={`${panelId}-tab-${i}`}
                  className="level-panel"
                >
                  <p className="level-note">{level.note}</p>
                  <div className="level-example">
                    <span className="level-example-k">policy</span>
                    <code>{level.example}</code>
                  </div>
                  <div className="level-chips">
                    <span className="level-chips-k">verdicts in play</span>
                    <span className="level-chips-row">
                      {level.chips.map((chip) => (
                        <span
                          key={chip.label}
                          className={`verdict-chip verdict-chip-${chip.v} level-chip`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="loop-strip" aria-label="The runtime check, at every level">
        <span className="loop-strip-label">every level runs the same loop</span>
        <ol className="loop-strip-track">
          {LOOP_STEPS.map((step, i) => (
            <li key={step.n} className="loop-strip-step">
              <span className="loop-strip-n">{step.n}</span>
              <span className="loop-strip-main">{step.label}</span>
              <span className="loop-strip-sub">{step.sub}</span>
              {i < LOOP_STEPS.length - 1 && (
                <span className="loop-strip-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
