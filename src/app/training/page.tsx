import { Database, Sparkles } from "lucide-react";
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
                <div>
                  <p className="eyebrow">{episode.product.name}</p>
                  <h3>{episode.persona.displayName}</h3>
                  <p>{episode.persona.task}</p>
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <b>{value}</b>
    </article>
  );
}
