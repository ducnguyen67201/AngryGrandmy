import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, Sparkles } from "lucide-react";

export default function MarketingHome() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Primary navigation">
        <Link className="marketing-brand" href="/">
          <span>GS</span>
          GrannySmith
        </Link>
        <Link className="marketing-nav-link" href="/lab">
          Open lab <ArrowRight size={14} />
        </Link>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-copy">
          <p className="marketing-kicker"><Sparkles size={14} /> Synthetic usability research</p>
          <h1>See your product through their eyes.</h1>
          <p className="marketing-lede">
            Give AI testers a real use case. Watch distinct target users navigate, think aloud,
            and surface the moments that need fixing.
          </p>
          <div className="marketing-actions">
            <Link className="marketing-primary" href="/lab">
              <Play size={16} /> Start a usability test
            </Link>
            <span><ShieldCheck size={14} /> Safe, permission-based testing</span>
          </div>
        </div>

        <div className="marketing-demo" aria-label="Example usability observation">
          <div className="marketing-browser">
            <div className="marketing-browser-bar"><i /><i /><i /><span>your-product.com</span></div>
            <div className="marketing-browser-body">
              <div className="marketing-persona-row">
                <span className="marketing-avatar">M</span>
                <div><b>Margaret</b><small>First-time user · testing now</small></div>
                <i className="marketing-live-dot" />
              </div>
              <blockquote>“I’m not sure whether this button submits the form.”</blockquote>
              <div className="marketing-signal"><span>Friction found</span><b>Make the next action explicit</b></div>
            </div>
          </div>
        </div>
      </section>

      <footer className="marketing-footer">
        <span>H Company computer use</span>
        <span>Gradium voices</span>
        <span>Evidence-backed fixes</span>
      </footer>
    </main>
  );
}
