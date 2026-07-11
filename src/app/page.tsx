import {
  ArrowRight,
  CheckCircle2,
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
              <Sparkles size={14} /> Synthetic usability lab
            </p>
            <h1>
              Watch real-world personas
              <span>test every path.</span>
            </h1>
            <p className="hero-description">
              Four computer-use agents explore your product as different people. See where they
              hesitate, backtrack, and succeed—before your customers have to.
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
                <p>Four perspectives. One evidence-backed report.</p>
              </div>
            </div>
          </div>

          <AnimatedAgentJourney snapshot={snapshot} />
        </div>
      </section>

      <section className="results-section" id="evidence">
        <div className="section-heading">
          <p className="eyebrow">Evidence, not guesswork</p>
          <h2>Every reaction becomes a concrete product decision.</h2>
          <p>
            GrannySmith combines trajectory evidence across personas into a deterministic score
            and prioritized fixes.
          </p>
        </div>

        <div className="result-cards">
          <article className="result-card result-score">
            <ShieldCheck />
            <p className="result-number">{report?.score ?? 0}<span>/100</span></p>
            <h3>Human-Friendly Score</h3>
            <p>Calculated from completion, clarity, efficiency, recovery, and trust.</p>
          </article>
          <article className="result-card">
            <Sparkles />
            <p className="result-number">{report?.sharedHotspots.length ?? 0}</p>
            <h3>Shared friction hotspots</h3>
            <p>Confusion clustered across multiple synthetic personas.</p>
          </article>
          <article className="result-card">
            <ExternalLink />
            <p className="result-number">{snapshot.sessions.length}</p>
            <h3>Evidence replays</h3>
            <p>Step-level screenshots and actions for every completed trajectory.</p>
          </article>
        </div>
      </section>

      <section className="insight-section" id="how-it-works">
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
