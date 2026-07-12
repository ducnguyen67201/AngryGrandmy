import { Bot, Check, LoaderCircle, Sparkles } from "lucide-react";
import type { ImprovementCandidate } from "@/lib/fixes/improvement-handoff";

export type ImprovementProposal = {
  mode: string;
  proposals: Array<{
    role: string;
    details: string;
  }>;
};

type ImprovementWorkspaceProps = {
  candidate: ImprovementCandidate;
  error: string | null;
  loading: boolean;
  proposal: ImprovementProposal | null;
};

export function ImprovementWorkspace({
  candidate,
  error,
  loading,
  proposal,
}: ImprovementWorkspaceProps) {
  return (
    <section className="improvement-workspace" aria-live="polite">
      <div className="improvement-workspace-heading">
        <span><Sparkles size={15} /></span>
        <div>
          <small>Evidence → code improvement</small>
          <h3>Improvement workspace</h3>
        </div>
        <strong className={proposal ? "is-ready" : ""}>
          {loading ? (
            <><LoaderCircle className="improvement-spinner" size={13} /> Reading the connected codebase…</>
          ) : proposal ? (
            <><Check size={13} /> Proposal ready</>
          ) : (
            "Finding selected"
          )}
        </strong>
      </div>

      <div className="improvement-evidence-grid">
        <div>
          <small>Selected finding · severity {candidate.friction.severity}/5</small>
          <b>{candidate.friction.recommendation}</b>
        </div>
        <div>
          <small>Visual evidence</small>
          <p>{candidate.friction.visibleEvidence}</p>
        </div>
      </div>

      {error ? <p className="improvement-error" role="alert">{error}</p> : null}

      {proposal ? (
        <div className="improvement-proposals">
          {proposal.proposals.map((item) => (
            <article key={item.role}>
              <span><Bot size={13} /> {formatRole(item.role)}</span>
              <p>{item.details}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatRole(role: string) {
  return role.replaceAll("-", " ");
}
