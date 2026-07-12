import {
  ArrowRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatedAgentJourney } from "@/components/animated-agent-journey";
import { createDemoRun } from "@/lib/fixtures/demo-run";

export default function Home() {
  const snapshot = createDemoRun();
  const report = snapshot.report;
  const selectedSession =
    snapshot.sessions.find(
      (session) => session.personaId === snapshot.selectedPersonaId,
    ) ?? snapshot.sessions[0];

  return (
    <main>
      <section className="landing-hero">
        <nav aria-label="Primary navigation" className="landing-nav">
          <a className="brand" href="#top" aria-label="GrannySmith home">
            <span className="brand-mark">GS</span>
            <span>GrannySmith</span>
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#evidence">Evidence</a>
            <a href="/training">Training set</a>
            <a href="/calibrate">Human calibration</a>
            <a href="#safety">Safety</a>
          </div>
          <a className="nav-cta" href="/lab">
            Start testing <ArrowRight size={15} />
          </a>
        </nav>

        <div className="hero-layout" id="top">
          <div className="hero-copy">
            <p className="eyebrow">
              <Sparkles size={14} /> Computer-use UX data engine
            </p>
            <h1>
              Turn agent traces into{" "}
              <span className="hero-title-line">good UI signal.</span>
            </h1>
            <p className="hero-description">
              GrannySmith sends computer-use agents through your product and records what they
              see, try, click, misunderstand, and recover from. Every run becomes a model-ready
              usability episode for fixing today&apos;s UI and researching better UI generation.
            </p>

            <form action="/lab" className="hero-form" id="start" method="get">
              <label htmlFor="target-url">Authorized product URL</label>
              <div className="hero-form-row">
                <input
                  defaultValue="https://demo-health.example"
                  id="target-url"
                  name="url"
                  type="url"
                />
                <button type="submit">
                  <Play size={17} /> Release the panel
                </button>
              </div>
              <p>
                <ShieldCheck size={14} /> Only test sites you own or have permission to evaluate.
              </p>
            </form>

            <div className="hero-proof">
              <div className="proof-avatars" aria-hidden="true">
                <span>L</span><span>R</span><span>M</span><span>J</span>
              </div>
              <div>
                <div className="proof-stars" aria-label="Five stars">★★★★★</div>
                <p>Screen state, action, outcome, UX label.</p>
              </div>
            </div>
          </div>

          <AnimatedAgentJourney snapshot={snapshot} />
        </div>
      </section>

      <section className="results-section" id="evidence">
        <div className="section-heading">
          <p className="eyebrow">Evidence, not vibes</p>
          <h2>What the computer sees becomes a label for UI quality.</h2>
          <p>
            The dataset is not just screenshots. It links screen state, agent action,
            observed outcome, friction category, severity, and a concrete fix.
          </p>
        </div>

        <div className="result-cards">
          <article className="result-card result-score">
            <ShieldCheck />
            <p className="result-number">{report?.score ?? 0}<span>/100</span></p>
            <h3>Good or bad UI signal</h3>
            <p>Completion, clarity, recovery, trust, and safe-stop behavior become labels.</p>
          </article>
          <article className="result-card">
            <Sparkles />
            <p className="result-number">{report?.sharedHotspots.length ?? 0}</p>
            <h3>Computer-use traces</h3>
            <p>Screen observations, cursor points, narration, and frustration events are kept together.</p>
          </article>
          <article className="result-card">
            <ExternalLink />
            <p className="result-number">{snapshot.sessions.length}</p>
            <h3>Fix-ready episodes</h3>
            <p>Each failed interaction points to copy, layout, flow, or feedback changes.</p>
          </article>
        </div>
      </section>

      <section className="trace-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">
            <Code2 size={14} /> Computer-use format
          </p>
          <h2>One run becomes structured UI preference data.</h2>
          <p>
            GrannySmith preserves the causal chain: what was visible, what the agent tried,
            what happened next, and why that interaction helped or hurt the task.
          </p>
        </div>
        <div className="trace-flow">
          {[
            ["01", "Screen state", "URL, screenshot reference, visible element, cursor location."],
            ["02", "Agent action", "Click, type, navigate, hesitate, backtrack, or stop safely."],
            ["03", "Observed outcome", "New screen, no feedback, confusing request, or successful progress."],
            ["04", "UX label", "Good UI or bad UI signal with category, severity, and recommended fix."],
          ].map(([step, title, copy]) => (
            <article key={step}>
              <span>{step}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <pre className="trace-sample">{`{
  "screen": "what the computer sees",
  "action": "what the agent tried",
  "outcome": "what happened next",
  "label": "good_ui | bad_ui",
  "fix": "what would reduce friction"
}`}</pre>
      </section>

      <section className="insight-section">
        <div className="insight-quote">
          <p className="eyebrow">Focused persona voice</p>
          <blockquote>
            “{selectedSession?.finding?.frictionEvents[0]?.narratedObservation ??
              selectedSession?.finding?.summary}”
          </blockquote>
          <p>— Joan, low-confidence desktop user</p>
        </div>
        <div className="fix-list">
          <p className="eyebrow">Recommended next moves</p>
          {report?.topRecommendations.slice(0, 3).map((recommendation) => (
            <div key={recommendation}>
              <CheckCircle2 size={19} />
              <p>{recommendation}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer" id="safety">
        <span>GrannySmith</span>
        <p>
          Synthetic usability benchmark—not a replacement for human research or accessibility
          certification.
        </p>
      </footer>
    </main>
  );
}
