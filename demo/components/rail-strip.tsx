/* The checkpoint diagram: an agent proposes, one check fires, and only then
   does the action reach whichever rail you already use. The rails are
   destinations *behind* the checkpoint, not a compatibility wall. Text only,
   no logos, no trademark risk. */
const RAILS = ['Stripe', 'PayPal', 'x402', 'AP2 / ACP', 'MCP tools', 'card rails'] as const;

export function RailStrip() {
  return (
    <section aria-label="One check in front of every payment rail" className="rail-strip">
      <div className="rail-inner">
        <div className="rail-flow" role="img" aria-label="An agent proposes a money action, TrustLoopGuard.check() runs, and only then does it reach the rail you already use: Stripe, PayPal, x402, AP2 / ACP, MCP tools, or card rails.">
          <span className="rail-source">
            <span className="rail-source-k">agent</span>
            <span className="rail-source-v">proposes a money action</span>
          </span>

          <span className="rail-wire" aria-hidden="true" />

          <span className="rail-check">
            <span className="rail-check-dot" aria-hidden="true" />
            trustloopguard.check()
          </span>

          <span className="rail-fan" aria-hidden="true">
            <span className="rail-fan-line" />
          </span>

          <ul className="rail-list">
            {RAILS.map((rail) => (
              <li key={rail} className="rail-item">
                {rail}
              </li>
            ))}
          </ul>
        </div>
        <p className="rail-caption">One check in front of every rail you already use.</p>
      </div>
    </section>
  );
}
