import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatedAgentJourney } from "@/components/animated-agent-journey";
import { DemoLaunchForm } from "@/components/demo-launch-form";
import { createDemoRun } from "@/lib/fixtures/demo-run";

export default function Home() {
  const snapshot = createDemoRun();
  const report = snapshot.report;
  const selectedSession =
    snapshot.sessions.find((session) => session.personaId === snapshot.selectedPersonaId) ??
    snapshot.sessions[0];

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
            <a href="#safety">Safety</a>
          </div>
          <a className="nav-cta" href="#start">Start testing <ArrowRight size={15} /></a>
        </nav>

        <div className="hero-layout" id="top">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={14} /> Synthetic usability lab</p>
            <h1>
              <span className="hero-title-line">Watch real-world</span>
              {" "}
              <span className="hero-title-line">personas</span>
              {" "}
              <em>test every path.</em>
            </h1>
            <p className="hero-description">
              Four computer-use agents explore your product as different people. See where they
              hesitate, backtrack, and succeed—before your customers have to.
            </p>

            <DemoLaunchForm />

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

        <div className="signal-bridge" aria-label="Live trajectory becomes an evidence-backed report">
          <div className="signal-bridge-copy">
            <span>Live observation</span>
            <i aria-hidden="true" />
            <span>Normalized evidence</span>
            <i aria-hidden="true" />
            <strong>Product decision</strong>
          </div>
          <div className="signal-bridge-metrics">
            <span><b>04</b> personas</span>
            <span><b>27</b> actions watched</span>
            <span><b>03</b> shared signals</span>
          </div>
        </div>
      </section>

      <section className="results-section" id="evidence">
        <div className="section-heading">
          <p className="eyebrow">Evidence, not guesswork</p>
          <h2>Every reaction becomes a concrete product decision.</h2>
          <p>GrannySmith combines trajectory evidence across personas into a deterministic score and prioritized fixes.</p>
        </div>

        <div className="result-cards">
          <article className="result-card result-score" style={{ "--signal-color": "#55d8c1" } as React.CSSProperties}>
            <div className="result-card-icon result-prism"><i /><ShieldCheck /></div>
            <span className="evidence-provenance">Completion + trust signals</span>
            <p className="result-number">{report?.score ?? 0}<span>/100</span></p>
            <h3>Human-Friendly Score</h3>
            <p>Calculated from completion, clarity, efficiency, recovery, and trust.</p>
          </article>
          <article className="result-card" style={{ "--signal-color": "#8d6cff" } as React.CSSProperties}>
            <div className="result-card-icon"><Sparkles /></div>
            <span className="evidence-provenance">Shared persona signals</span>
            <p className="result-number">{report?.sharedHotspots.length ?? 0}</p>
            <h3>Shared friction hotspots</h3>
            <p>Confusion clustered across multiple synthetic personas.</p>
          </article>
          <article className="result-card" style={{ "--signal-color": "#ff756d" } as React.CSSProperties}>
            <div className="result-card-icon"><ExternalLink /></div>
            <span className="evidence-provenance">Trajectory provenance</span>
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
            “{selectedSession?.finding?.frictionEvents[0]?.narratedObservation ?? selectedSession?.finding?.summary}”
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
        <p>Synthetic usability benchmark—not a replacement for human research or accessibility certification.</p>
      </footer>
    </main>
  );
}
