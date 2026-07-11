"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ExternalLink, Play, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import type {
  NormalizedSession,
  RunSnapshot,
  UsabilityReport,
  VisualAgentState,
} from "@/lib/schemas/run";

type ApiRunPayload = {
  data?: RunSnapshot;
  meta?: {
    mode?: string;
    launchedCount?: number;
    reason?: string;
  };
  error?: { message?: string };
};

type VoiceReactionPayload = {
  data?: {
    source: "gradium" | "text";
    audioUrl: string | null;
    audioBase64: string | null;
    transcript: string;
  };
  error?: { message?: string };
};

const TERMINAL_STATUSES = new Set<NormalizedSession["status"]>([
  "completed",
  "timed_out",
  "interrupted",
  "failed",
]);

export default function Home() {
  const [snapshot, setSnapshot] = useState<RunSnapshot>(() => createDemoRun());
  const [targetUrl, setTargetUrl] = useState("https://demo-health.example");
  const [authorized, setAuthorized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceLine, setVoiceLine] = useState("Voice ready when a finding is selected.");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusLine, setStatusLine] = useState(
    "Mock-first build: real H Company routes can swap in behind this contract.",
  );
  const pendingResultIds = useRef(new Set<string>());
  const lastReportKey = useRef<string | null>(null);
  const liveMode = snapshot.phase === "running";
  const activeSessions = useMemo(
    () =>
      snapshot.sessions.filter(
        (session) => !TERMINAL_STATUSES.has(session.status),
      ),
    [snapshot.sessions],
  );
  const sessionsNeedingResults = useMemo(
    () =>
      snapshot.sessions.filter(
        (session) =>
          TERMINAL_STATUSES.has(session.status) &&
          !session.finding &&
          session.errorCode !== "provider_failure",
      ),
    [snapshot.sessions],
  );
  const report = snapshot.report;
  const sessionsByPersona = new Map(
    snapshot.sessions.map((session) => [session.personaId, session])
  );
  const selectedSession =
    snapshot.sessions.find((session) => session.personaId === snapshot.selectedPersonaId) ??
    snapshot.sessions[0];
  const selectedPersona = snapshot.analysis?.personas.find(
    (persona) => persona.id === selectedSession?.personaId,
  );
  const selectedNarration =
    selectedSession?.finding?.frictionEvents[0]?.narratedObservation ??
    selectedSession?.finding?.summary ??
    selectedPersona?.introLine ??
    "No persona finding is ready yet.";
  const completedWithFindings = snapshot.sessions.filter(
    (session) => session.finding,
  ).length;
  const scoreStatus = liveMode
    ? activeSessions.length > 0
      ? "provisional"
      : completedWithFindings > 0
        ? "finalizing"
        : "pending"
    : "final";

  useEffect(() => {
    if (!liveMode || activeSessions.length === 0) return;

    let cancelled = false;

    async function pollSessions() {
      const updates = await Promise.all(
        activeSessions.map(async (session) => {
          try {
            const params = new URLSearchParams({
              sessionId: session.sessionId,
              personaId: session.personaId,
            });
            const response = await fetch(`/api/session-status?${params}`);
            const payload = (await response.json()) as {
              data?: NormalizedSession | null;
            };
            return payload.data ?? session;
          } catch {
            return session;
          }
        }),
      );

      if (cancelled) return;

      const updatesById = new Map(
        updates.map((session) => [session.sessionId, session]),
      );
      setSnapshot((current) => ({
        ...current,
        sessions: current.sessions.map(
          (session) => updatesById.get(session.sessionId) ?? session,
        ),
        updatedAt: new Date().toISOString(),
      }));
      setStatusLine(
        `Polling ${updates.length} H Company session${updates.length === 1 ? "" : "s"} for live progress.`,
      );
    }

    const interval = window.setInterval(pollSessions, 4500);
    void pollSessions();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeSessions, liveMode]);

  useEffect(() => {
    if (!liveMode) return;
    if (activeSessions.length > 0) return;

    setStatusLine(
      "H sessions reached a terminal state. Gathering final answers for scoring.",
    );
  }, [activeSessions.length, liveMode]);

  useEffect(() => {
    if (!liveMode || sessionsNeedingResults.length === 0) return;

    let cancelled = false;
    const targets = sessionsNeedingResults.filter((session) => {
      if (pendingResultIds.current.has(session.sessionId)) return false;
      pendingResultIds.current.add(session.sessionId);
      return true;
    });

    if (targets.length === 0) return;

    async function gatherResults() {
      const results = await Promise.all(
        targets.map(async (session) => {
          try {
            const params = new URLSearchParams({
              sessionId: session.sessionId,
              personaId: session.personaId,
            });
            const response = await fetch(`/api/session-result?${params}`);
            const payload = (await response.json()) as {
              data?: NormalizedSession | null;
            };
            return payload.data ?? markResultFailure(session);
          } catch {
            return markResultFailure(session);
          }
        }),
      );

      if (cancelled) return;

      const resultsById = new Map(
        results.map((session) => [session.sessionId, session]),
      );
      setSnapshot((current) => ({
        ...current,
        sessions: current.sessions.map(
          (session) => resultsById.get(session.sessionId) ?? session,
        ),
        updatedAt: new Date().toISOString(),
      }));
      setStatusLine(
        `Captured ${results.length} H final answer${results.length === 1 ? "" : "s"} for scoring.`,
      );
    }

    void gatherResults();

    return () => {
      cancelled = true;
    };
  }, [liveMode, sessionsNeedingResults]);

  useEffect(() => {
    if (!liveMode || activeSessions.length > 0) return;
    if (!snapshot.sessions.some((session) => session.finding)) return;

    const reportKey = snapshot.sessions
      .map((session) => `${session.sessionId}:${session.finding ? "1" : "0"}`)
      .join("|");
    if (lastReportKey.current === reportKey) return;
    lastReportKey.current = reportKey;

    async function scoreRun() {
      try {
        const expectedStepBudgetByPersona = Object.fromEntries(
          snapshot.analysis?.personas.map((persona) => [
            persona.id,
            persona.expectedStepBudget,
          ]) ?? [],
        );
        const response = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessions: snapshot.sessions,
            expectedStepBudgetByPersona,
          }),
        });
        const payload = (await response.json()) as {
          data?: UsabilityReport;
        };
        if (!payload.data) return;

        setSnapshot((current) => ({
          ...current,
          phase: "report",
          report: payload.data ?? current.report,
          selectedPersonaId:
            current.sessions.find((session) => session.finding)?.personaId ??
            current.selectedPersonaId,
          updatedAt: new Date().toISOString(),
        }));
        setStatusLine("Live H findings scored into a Human-Friendly report.");
      } catch {
        setStatusLine("H findings were captured, but report scoring failed.");
      }
    }

    void scoreRun();
  }, [activeSessions.length, liveMode, snapshot.analysis?.personas, snapshot.sessions]);

  async function handleLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatusLine("Launching four H Company computer-use sessions.");

    try {
      const response = await fetch("/api/run-h-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          objective: "Find the primary user workflow and stop before an irreversible action.",
          authorizationConfirmed: authorized,
        }),
      });
      const payload = (await response.json()) as ApiRunPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not start analysis.");
      }

      setSnapshot(payload.data);
      setDrawerOpen(false);
      if (payload.meta?.mode === "h-company") {
        setStatusLine(
          `Launched ${payload.meta.launchedCount ?? payload.data.sessions.length} H Company sessions for ${payload.data.analysis?.productName ?? "target product"}.`,
        );
      } else {
        setStatusLine(
          `Replay fallback loaded for ${payload.data.analysis?.productName ?? "target product"}${payload.meta?.reason ? `: ${payload.meta.reason}` : "."}`,
        );
      }
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Could not launch H agents.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVoice() {
    if (!selectedSession || !selectedPersona || voiceLoading) return;

    setVoiceLoading(true);
    setVoiceLine("Preparing persona voice...");

    try {
      const response = await fetch("/api/voice-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: selectedPersona.id,
          voiceSlot: selectedPersona.voiceSlot,
          text: selectedNarration,
        }),
      });
      const payload = (await response.json()) as VoiceReactionPayload;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Voice generation failed.");
      }

      const audioSrc = payload.data.audioUrl
        ? payload.data.audioUrl
        : payload.data.audioBase64
          ? `data:audio/mpeg;base64,${payload.data.audioBase64}`
          : null;

      if (audioSrc) {
        await new Audio(audioSrc).play();
        setVoiceLine(
          payload.data.source === "gradium"
            ? "Gradium voice played."
            : "Voice audio played.",
        );
      } else {
        speakWithBrowser(payload.data.transcript);
        setVoiceLine("Gradium fallback: browser voice spoke the finding.");
      }
    } catch (error) {
      speakWithBrowser(selectedNarration);
      setVoiceLine(
        error instanceof Error
          ? `${error.message} Browser voice fallback used.`
          : "Browser voice fallback used.",
      );
    } finally {
      setVoiceLoading(false);
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
              <div className="rounded bg-mint px-3 py-1 text-sm font-black text-ink">
                {liveMode ? "Live H Mode" : "Demo Mode"}
              </div>
            </div>

            <div className="grid h-full min-h-[520px] grid-cols-2 gap-3 p-4 pt-24">
              {snapshot.analysis?.personas.map((persona) => {
                const session = sessionsByPersona.get(persona.id);

                return (
                <button
                  className={`relative flex flex-col justify-end overflow-hidden rounded-md border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-mint/80 ${stationClass(
                    session?.visualState ?? "queued"
                  )} ${
                    snapshot.selectedPersonaId === persona.id
                      ? "ring-2 ring-mint/80"
                      : ""
                  }`}
                  key={persona.id}
                  onClick={() => {
                    setSnapshot((current) => ({
                      ...current,
                      selectedPersonaId: persona.id,
                    }));
                    setDrawerOpen(true);
                  }}
                  type="button"
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
                    {session?.agentViewUrl ? (
                      <a
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-mint transition hover:text-paper"
                        href={session.agentViewUrl}
                        onClick={(event) => event.stopPropagation()}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink size={13} />
                        Watch
                      </a>
                    ) : null}
                  </div>
                </button>
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
          <p className="mt-2 text-sm text-ink/66">
            Human-Friendly Score is {scoreStatus}; {completedWithFindings}/
            {snapshot.sessions.length} findings captured.
          </p>
        </div>
        <div className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <Sparkles className="mb-4 text-grape" />
          <p className="text-3xl font-black">{report?.sharedHotspots.length ?? 0} hotspots</p>
          <p className="mt-2 text-sm text-ink/66">Shared confusion clustered across personas.</p>
        </div>
        <div className="rounded-lg border border-ink/12 bg-white/70 p-5">
          <ExternalLink className="mb-4 text-tomato" />
          <p className="text-3xl font-black">
            {liveMode ? activeSessions.length : snapshot.sessions.length}{" "}
            {liveMode ? "live" : "replays"}
          </p>
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
            {selectedNarration}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-paper disabled:cursor-not-allowed disabled:opacity-55"
              disabled={voiceLoading || !selectedPersona}
              onClick={handleVoice}
              type="button"
            >
              <Volume2 size={17} />
              {voiceLoading ? "Voicing..." : "Speak Finding"}
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
              {voiceLine}
            </p>
          </div>
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

      {drawerOpen ? (
        <section className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-ink/12 bg-paper p-5 shadow-2xl md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-ink/45">
                Evidence Drawer
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {selectedPersona?.displayName ?? "Persona"} report
              </h2>
              <p className="mt-2 text-sm font-semibold text-brass">
                {selectedPersona?.tagline ?? "Synthetic tester"}
              </p>
            </div>
            <button
              className="rounded-md border border-ink/15 px-3 py-2 text-sm font-black"
              onClick={() => setDrawerOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricTile label="Status" value={selectedSession?.status ?? "queued"} />
            <MetricTile
              label="Steps"
              value={String(selectedSession?.stepCount ?? 0)}
            />
            <MetricTile
              label="Score impact"
              value={scoreImpactLabel(selectedSession)}
            />
          </div>

          <section className="mt-6 rounded-lg border border-ink/12 bg-white/70 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink/45">
              Task
            </p>
            <p className="mt-3 leading-7 text-ink/75">
              {selectedPersona?.task ?? "No task selected yet."}
            </p>
          </section>

          <section className="mt-4 rounded-lg border border-ink/12 bg-white/70 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink/45">
              Finding
            </p>
            <p className="mt-3 text-xl font-black">
              {selectedSession?.finding?.completion ?? "waiting"}
            </p>
            <p className="mt-3 leading-7 text-ink/75">
              {selectedSession?.finding?.summary ??
                selectedSession?.latestActionLabel ??
                "No final finding has arrived yet."}
            </p>
          </section>

          <section className="mt-4 rounded-lg border border-ink/12 bg-white/70 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink/45">
              Evidence
            </p>
            <div className="mt-3 grid gap-2">
              {(selectedSession?.finding?.evidence.length
                ? selectedSession.finding.evidence
                : ["Evidence will appear when the H session result is parsed."]
              ).map((item) => (
                <p
                  className="rounded-md border border-ink/10 bg-paper/70 p-3 text-sm leading-6 text-ink/72"
                  key={item}
                >
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-ink/12 bg-white/70 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink/45">
              Friction Events
            </p>
            <div className="mt-3 grid gap-3">
              {(selectedSession?.finding?.frictionEvents.length
                ? selectedSession.finding.frictionEvents
                : []
              ).map((event) => (
                <article
                  className="rounded-md border border-ink/10 bg-paper/70 p-3"
                  key={`${event.step}-${event.observation}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black capitalize">{event.category}</p>
                    <p className="rounded bg-ink px-2 py-1 text-xs font-black text-paper">
                      Severity {event.severity}/5
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/75">
                    {event.observation}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-brass">
                    Fix: {event.recommendation}
                  </p>
                </article>
              ))}
              {!selectedSession?.finding?.frictionEvents.length ? (
                <p className="rounded-md border border-ink/10 bg-paper/70 p-3 text-sm leading-6 text-ink/60">
                  No friction events have been captured yet.
                </p>
              ) : null}
            </div>
          </section>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-paper disabled:cursor-not-allowed disabled:opacity-55"
              disabled={voiceLoading || !selectedPersona}
              onClick={handleVoice}
              type="button"
            >
              <Volume2 size={17} />
              Speak
            </button>
            {selectedSession?.agentViewUrl ? (
              <a
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink/15 px-4 text-sm font-black text-ink"
                href={selectedSession.agentViewUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={16} />
                Watch Agent
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/12 bg-white/70 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
        {label}
      </p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function markResultFailure(session: NormalizedSession): NormalizedSession {
  return {
    ...session,
    latestActionLabel: "Finished, but result extraction failed",
    errorCode: "provider_failure",
  };
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

function scoreImpactLabel(session?: NormalizedSession): string {
  switch (session?.finding?.completion) {
    case "success":
      return "positive";
    case "partial":
      return "mixed";
    case "blocked":
    case "abandoned":
      return "negative";
    default:
      return "pending";
  }
}

function speakWithBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}
