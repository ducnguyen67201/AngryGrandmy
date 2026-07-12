import { Code2, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { listTrainingEpisodes } from "@/lib/training/repository";
import { summarizeTrainingCollection } from "@/lib/training/training-episode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TrainingDatasetPage() {
  const episodes = await listTrainingEpisodes();
  const summary = summarizeTrainingCollection(episodes);

  return (
    <main className="training-page">
      <nav aria-label="Training dataset navigation" className="training-nav">
        <Link className="brand" href="/" aria-label="GrannySmith home">
          <span className="brand-mark">GS</span>
          <span>GrannySmith</span>
        </Link>
        <Link className="nav-cta" href="/lab">
          Run another test
        </Link>
      </nav>

      <section className="training-hero">
        <p className="eyebrow">
          <Database size={14} /> Research dataset
        </p>
        <h1>Training set collected from computer-use runs.</h1>
        <p>
          Each episode captures the persona, task, trajectory signals, friction labels,
          recommendation, and usability score without storing raw inline screenshot blobs.
        </p>
        <div className="training-summary-grid" aria-label="Training dataset summary">
          <MetricCard label="Episodes" value={summary.episodeCount} />
          <MetricCard label="Training points" value={summary.trainingPointCount} />
          <MetricCard label="Friction labels" value={summary.frictionCount} />
          <MetricCard label="Personas" value={summary.personaCount} />
        </div>
      </section>

      <section className="training-list" aria-labelledby="training-list-heading">
        <div className="section-heading">
          <p className="eyebrow">
            <Sparkles size={14} /> Dataset rows
          </p>
          <h2 id="training-list-heading">These are the training examples.</h2>
          <p>
            The page updates after completed runs are collected from the lab.
          </p>
        </div>

        {episodes.length ? (
          <div className="training-episode-grid">
            {episodes.map((episode) => (
              <article className="training-episode-card" key={episode.id}>
                <div className="training-episode-heading">
                  <div>
                    <p className="eyebrow">{episode.product.name}</p>
                    <h3>{episode.persona.displayName}</h3>
                    <p>{episode.persona.task}</p>
                  </div>
                  <div className="training-id-stack">
                    <span>{episode.id}</span>
                    <span>{episode.collectedAt}</span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Outcome</dt>
                    <dd>{episode.labels.completion}</dd>
                  </div>
                  <div>
                    <dt>Signals</dt>
                    <dd>{episode.trajectory.length}</dd>
                  </div>
                  <div>
                    <dt>Training points</dt>
                    <dd>{episode.trainingPoints}</dd>
                  </div>
                  <div>
                    <dt>Score</dt>
                    <dd>{episode.report.score ?? "n/a"}</dd>
                  </div>
                </dl>
                <p className="training-finding">{episode.labels.findingSummary}</p>
                {episode.report.topRecommendations[0] ? (
                  <p className="training-recommendation">
                    {episode.report.topRecommendations[0]}
                  </p>
                ) : null}
                <div className="training-data-sections">
                  <DataSection title="Run metadata">
                    <DataGrid
                      rows={[
                        ["Run ID", episode.runId],
                        ["Session ID", episode.sessionId],
                        ["Persona ID", episode.personaId],
                        ["Target URL", episode.targetUrl],
                        ["Objective", episode.objective ?? "n/a"],
                        ["Product category", episode.product.category],
                      ]}
                    />
                  </DataSection>

                  <DataSection title="Persona profile">
                    <DataGrid
                      rows={[
                        ["Display name", episode.persona.displayName],
                        ["Tagline", episode.persona.tagline],
                        ["Digital confidence", episode.persona.digitalConfidence],
                        ["Context", episode.persona.context],
                        ["Behaviors", episode.persona.behaviors.join("; ")],
                        ["Trust boundaries", episode.persona.trustBoundaries.join("; ")],
                        ["Success criteria", episode.persona.successCriteria.join("; ")],
                        ["Stop conditions", episode.persona.stopConditions.join("; ")],
                      ]}
                    />
                  </DataSection>

                  <DataSection title={`Labels and friction (${episode.labels.frictionCount})`}>
                    <DataGrid
                      rows={[
                        ["Completion", episode.labels.completion],
                        ["Outcome", episode.labels.outcome],
                        ["Safe stop reached", String(episode.labels.safeStopReached)],
                        ["Step count", String(episode.labels.stepCount)],
                        ["Finding summary", episode.labels.findingSummary],
                      ]}
                    />
                    <RawBlock value={episode.labels.frictionEvents} />
                  </DataSection>

                  <DataSection title={`Trajectory events (${episode.trajectory.length})`}>
                    {episode.trajectory.length ? (
                      <div className="trajectory-table" role="table" aria-label="Collected trajectory events">
                        <div role="row">
                          <span role="columnheader">Step</span>
                          <span role="columnheader">Type</span>
                          <span role="columnheader">Signal</span>
                          <span role="columnheader">Point</span>
                        </div>
                        {episode.trajectory.map((event) => (
                          <div key={event.eventId} role="row">
                            <span role="cell">{event.step}</span>
                            <span role="cell">{event.type}</span>
                            <span role="cell">
                              {event.text ??
                                event.observation ??
                                event.visibleEvidence ??
                                event.query ??
                                event.screenshot.ref ??
                                "viewport captured"}
                            </span>
                            <span role="cell">
                              {event.x !== null && event.y !== null
                                ? `${event.x}, ${event.y}`
                                : event.coordinateSource ?? "n/a"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="training-muted">No runtime trajectory events were attached to this episode.</p>
                    )}
                  </DataSection>

                  <details className="training-raw-json">
                    <summary>
                      <Code2 size={14} /> Raw episode JSON
                    </summary>
                    <RawBlock value={episode} />
                  </details>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="training-empty">
            <Database size={22} />
            <h3>No training examples collected yet.</h3>
            <p>Complete a lab run and GrannySmith will collect the episodes here.</p>
            <Link href="/lab">Open the lab</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function DataSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <details className="training-data-section" open>
      <summary>{title}</summary>
      {children}
    </details>
  );
}

function DataGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="training-data-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "n/a"}</dd>
        </div>
      ))}
    </dl>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <b>{value}</b>
    </article>
  );
}

function RawBlock({ value }: { value: unknown }) {
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
