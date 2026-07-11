"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, Play, ShieldCheck, Sparkles } from "lucide-react";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import type { RunSnapshot, VisualAgentState } from "@/lib/schemas/run";

export default function Home() {
  const [snapshot, setSnapshot] = useState<RunSnapshot>(() => createDemoRun());
  const [targetUrl, setTargetUrl] = useState("https://demo-health.example");
  const [authorized, setAuthorized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState(
    "Mock-first build: real H Company routes can swap in behind this contract.",
  );
  const report = snapshot.report;
  const sessionsByPersona = new Map(
    snapshot.sessions.map((session) => [session.personaId, session])
  );
  const selectedSession =
    snapshot.sessions.find((session) => session.personaId === snapshot.selectedPersonaId) ??
    snapshot.sessions[0];

  async function handleLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatusLine("Dispatching through the same API contract the live demo will use.");

    try {
      const response = await fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          objective: "Find the primary user workflow and stop before an irreversible action.",
          authorizationConfirmed: authorized,
        }),
      });
      const payload = (await response.json()) as {
        data?: RunSnapshot;
        meta?: { mode?: string };
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not start analysis.");
      }

      setSnapshot(payload.data);
      setStatusLine(
        `Loaded ${payload.data.analysis?.productName ?? "target product"} through /api/analyze-product (${payload.meta?.mode ?? "demo"}).`,
      );
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Could not start analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 text-ink md:px-8">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded bg-ink text-lg font-black text-paper">
                GS
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Computer Use Hackathon
                </p>
                <h1 className="text-2xl font-black">GrannySmith</h1>
              </div>
            </div>

            <p className="max-w-2xl text-4xl font-black leading-[0.96] md:text-6xl">
              Can real people use the thing you just shipped?
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/72 md:text-lg md:leading-8">
              Paste an authorized product URL. Four synthetic users enter the site with H Company
              computer-use agents, Gradium gives the focused persona a voice, and the lab returns a
              deterministic Human-Friendly Score.
            </p>
          </div>

          <form
            className="grid gap-3 rounded-lg border border-ink/12 bg-white/72 p-4 shadow-sm backdrop-blur"
            onSubmit={handleLaunch}
          >
            <label className="text-sm font-bold" htmlFor="target-url">
              Authorized site URL
            </label>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                id="target-url"
                className="min-h-12 rounded-md border border-ink/18 bg-white px-4 text-base"
                onChange={(event) => setTargetUrl(event.target.value)}
                value={targetUrl}
                type="url"
              />
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 font-bold text-paper disabled:cursor-not-allowed disabled:opacity-55"
                disabled={loading || !authorized}
                type="submit"
              >
                <Play size={18} />
                {loading ? "Dispatching..." : "Release the Panel"}
              </button>
            </div>
            <label className="inline-flex items-start gap-3 text-sm leading-6 text-ink/70">
              <input
                checked={authorized}
                className="mt-1"
                onChange={(event) => setAuthorized(event.target.checked)}
                type="checkbox"
              />
              I own this site or have explicit permission to run synthetic usability tests against
              it.
            </label>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
              {statusLine}
            </p>
          </form>
        </div>

        <div className="grid min-h-[calc(100vh-3rem)] grid-rows-[1fr_auto] gap-5">
          <section className="relative overflow-hidden rounded-lg border border-ink/12 bg-[#202426] text-paper shadow-xl">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-paper/55">Live Lab</p>
                <h2 className="text-2xl font-black">Four testers, one product</h2>
              </div>
              <div className="rounded bg-mint px-3 py-1 text-sm font-black text-ink">Demo Mode</div>
            </div>

            <div className="grid h-full min-h-[520px] grid-cols-2 gap-3 p-4 pt-24">
              {snapshot.analysis?.personas.map((persona) => {
                const session = sessionsByPersona.get(persona.id);

                return (
                <div
                  className={`relative flex flex-col justify-end overflow-hidden rounded-md border p-4 ${stationClass(
                    session?.visualState ?? "queued"
                  )}`}
                  key={persona.id}
                >
                  <div className="absolute left-5 top-5 h-20 w-24 rounded-md border border-mint/30 bg-[#101415] shadow-[0_0_24px_rgba(98,196,155,0.18)]">
                    <div className="m-2 h-3 rounded bg-mint/70" />
                    <div className="mx-2 mt-3 h-2 rounded bg-white/20" />
                    <div className="mx-2 mt-2 h-2 w-2/3 rounded bg-white/16" />
                  </div>
                  <div className="mx-auto mb-9 h-28 w-24 rounded-t-full bg-[#d9b18f] shadow-lg">
                    <div className="mx-auto h-10 w-16 rounded-b-full bg-white/75" />
                    <div
                      className={`mx-auto mt-8 h-8 w-20 rounded-t-2xl ${variantClass(
                        persona.visualVariant
                      )}`}
                    />
                  </div>
                  <div className="rounded bg-black/24 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black">{persona.displayName}</span>
                      <span className="rounded bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.12em]">
                        {session?.visualState ?? "queued"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-paper/68">
                      {session?.latestActionLabel ?? persona.task}
                    </p>
                  </div>
                </div>
              );
              })}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            {snapshot.analysis?.personas.map((persona) => (
              <article className="rounded-lg border border-ink/12 bg-white/72 p-4 shadow-sm" key={persona.id}>
                <p className="font-black">{persona.displayName}</p>
                <p className="mt-1 text-sm font-semibold text-brass">{persona.tagline}</p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/68">{persona.context}</p>
              </article>
            ))}
          </section>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <ShieldCheck className="mb-4 text-mint" />
          <p className="text-3xl font-black">{report?.score ?? 0}/100</p>
          <p className="mt-2 text-sm text-ink/66">Human-Friendly Score from deterministic evidence.</p>
        </div>
        <div className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <Sparkles className="mb-4 text-grape" />
          <p className="text-3xl font-black">{report?.sharedHotspots.length ?? 0} hotspots</p>
          <p className="mt-2 text-sm text-ink/66">Shared confusion clustered across personas.</p>
        </div>
        <div className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <ExternalLink className="mb-4 text-tomato" />
          <p className="text-3xl font-black">{snapshot.sessions.length} replays</p>
          <p className="mt-2 text-sm text-ink/66">Each session keeps an H Agent View evidence link.</p>
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-7xl gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <article className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-ink/45">
            Focused persona voice
          </p>
          <h3 className="mt-2 text-2xl font-black">
            {selectedSession?.personaId ?? "persona"} says:
          </h3>
          <p className="mt-4 text-lg leading-8 text-ink/75">
            {selectedSession?.finding?.frictionEvents[0]?.narratedObservation ??
              selectedSession?.finding?.summary}
          </p>
        </article>

        <article className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-ink/45">
            Top fixes
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {report?.topRecommendations.slice(0, 4).map((recommendation) => (
              <div className="rounded-md border border-ink/10 bg-white p-4" key={recommendation}>
                <p className="text-sm leading-6 text-ink/72">{recommendation}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function stationClass(state: VisualAgentState): string {
  const classes: Record<VisualAgentState, string> = {
    queued: "border-white/10 bg-[#2d3335]",
    launching: "border-white/10 bg-[#30373a]",
    reading: "border-mint/35 bg-[#2d3335]",
    navigating: "border-mint/35 bg-[#2f3638]",
    typing: "border-grape/40 bg-[#30313d]",
    backtracking: "border-brass/55 bg-[#39342d]",
    confused: "border-brass/70 bg-[#40362b]",
    blocked: "border-tomato/70 bg-[#422d2d]",
    succeeded: "border-mint/70 bg-[#253b33]",
    abandoned: "border-tomato/55 bg-[#382e31]",
    failed: "border-tomato/55 bg-[#382e31]"
  };

  return classes[state];
}

function variantClass(variant: number): string {
  return ["bg-grape", "bg-mint", "bg-brass", "bg-tomato"][variant] ?? "bg-grape";
}
