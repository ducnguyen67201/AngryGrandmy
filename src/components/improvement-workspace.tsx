import { Bot, Check, FileCode2, GitPullRequest, LoaderCircle, Sparkles } from "lucide-react";
import type { ImprovementCandidate } from "@/lib/fixes/improvement-handoff";
import type { PreparedRepositoryChange } from "@/lib/fixes/prepare-repository-change";
import type { PublicRepositoryMetadata } from "@/lib/repository/local-repository";

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
  onPrepareChange(): void;
  preparedChange: PreparedRepositoryChange | null;
  preparingChange: boolean;
  proposal: ImprovementProposal | null;
  repository: PublicRepositoryMetadata | null;
};

export function ImprovementWorkspace({
  candidate,
  error,
  loading,
  onPrepareChange,
  preparedChange,
  preparingChange,
  proposal,
  repository,
}: ImprovementWorkspaceProps) {
  return (
    <section className="improvement-workspace" aria-live="polite">
      <div className="improvement-workspace-heading">
        <span><Sparkles size={15} /></span>
        <div>
          <small>Evidence → code improvement</small>
          <h3>Improvement workspace</h3>
        </div>
        <strong className={proposal || preparedChange?.readyForPr ? "is-ready" : ""}>
          {preparedChange?.readyForPr ? (
            <><GitPullRequest size={13} /> PR ready</>
          ) : loading ? (
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

      {proposal ? (
        <div className="pr-preparation-bar">
          <div>
            <FileCode2 size={15} />
            <span>
              <b>{repository ? repository.name : "Repository not connected"}</b>
              <small>
                {repository
                  ? `${repository.relativeTarget} · ${repository.branch}`
                  : "Restart the lab with pnpm dev:connected to enable code changes."}
              </small>
            </span>
          </div>
          {!preparedChange ? (
            <button
              disabled={!repository || preparingChange}
              onClick={onPrepareChange}
              type="button"
            >
              {preparingChange ? (
                <><LoaderCircle className="improvement-spinner" size={13} /> Preparing code change…</>
              ) : (
                <><GitPullRequest size={13} /> Prepare code change</>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      {preparedChange ? (
        <div className="prepared-change">
          <div className="prepared-checks">
            {preparedChange.checks.map((check) => (
              <span className={check.passed ? "is-passing" : "is-failing"} key={check.command}>
                {check.passed ? <Check size={12} /> : "×"} {check.command}
              </span>
            ))}
          </div>
          <pre aria-label="Prepared repository diff">{preparedChange.diff}</pre>
          <p>
            {preparedChange.readyForPr
              ? "A real local diff exists and every available check passed. It is ready for commit, push, and PR creation."
              : "The diff exists, but failing checks must be fixed before creating a PR."}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function formatRole(role: string) {
  return role.replaceAll("-", " ");
}
