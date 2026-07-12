import { Eyebrow } from './how';

export function FounderNote() {
  return (
    <section aria-labelledby="founder-heading" className="section section-compact">
      <div className="memo">
        <div className="memo-head">
          <Eyebrow>Why this exists</Eyebrow>
          <h2 id="founder-heading" className="sr-only">
            A memo from the founder
          </h2>
          <dl className="memo-meta">
            <div>
              <dt>From</dt>
              <dd>Duc · Founder</dd>
            </div>
            <div>
              <dt>Re</dt>
              <dd>Why every decision here is signed</dd>
            </div>
          </dl>
        </div>

        <p className="memo-body">
          Before TrustLoopGuard, I spent years at an AI voice-agent testing company, watching
          production agents fail in every way an agent can. That is why every decision here is{' '}
          <b>signed</b>, <b>capped</b>, and <b>provable</b>. I have seen what happens without it.
        </p>

        <div className="memo-sign">
          <span className="memo-signature" aria-hidden="true">
            <Signature />
          </span>
          <span className="memo-sign-meta">
            <span className="memo-sign-name">Duc</span>
            <span className="memo-sign-role">Founder, TrustLoopGuard</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* A quiet ink flourish — decorative signature, not a real autograph. */
function Signature() {
  return (
    <svg width="118" height="34" viewBox="0 0 118 34" fill="none" aria-hidden="true">
      <path
        d="M4 26c6-2 9-16 6-19-2-2-5 2-4 8 1 7 6 12 11 11 4-1 5-7 3-9-2-1-4 2-3 6 1 5 6 8 11 6 5-3 6-10 9-11 3 0 2 7 6 8 3 1 6-2 7-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M74 24c8-1 24-2 40-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}
