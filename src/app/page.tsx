"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Clipboard, Download, ExternalLink, Play, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { AnimatedAgentJourney } from "@/components/animated-agent-journey";
import { PersonaBuilder, type PersonaDraft } from "@/components/persona-builder";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  buildVisualHotspots,
  summarizeHotspots,
  type VisualHotspot,
} from "@/lib/hotspots/build-hotspots";
import {
  buildJudgeSummary,
  buildMarkdownReport,
  buildReportJson,
} from "@/lib/report/export-report";
import {
  buildPersistedLabState,
  parsePersistedLabState,
  PERSISTED_LAB_STATE_KEY,
} from "@/lib/persistence/lab-state";
import type {
  NormalizedSession,
  RunSnapshot,
  UsabilityReport,
  VisualAgentState,
} from "@/lib/schemas/run";
import { getPanelFeedback } from "@/lib/ui/panel-feedback";
import { getHeatmapDisplay } from "@/lib/ui/heatmap-display";
import { createCustomPersona } from "@/lib/personas/create-custom-persona";
import { getRunGuidance } from "@/lib/ui/run-guidance";

type ApiRunPayload = {
  data?: RunSnapshot;
  meta?: {
    mode?: string;
    launchedCount?: number;
    reason?: string;
  };
  error?: { message?: string };
};

type TestPlanPayload = {
  data?: {
    analysis?: RunSnapshot["analysis"];
    personas?: NonNullable<RunSnapshot["analysis"]>["personas"];
    primaryFlows?: NonNullable<RunSnapshot["analysis"]>["primaryFlows"];
  };
  meta?: {
    mode?: string;
    model?: string | null;
    fallbackReason?: string | null;
  };
  error?: { message?: string };
};

type VoiceReactionPayload = {
  data?: {
    source: "gradium" | "text";
    audioUrl: string | null;
    audioBase64: string | null;
    audioMime: string | null;
    transcript: string;
  };
  error?: { message?: string };
};

type LocalizeHotspotsPayload = {
  data?: VisualHotspot[];
  meta?: {
    mode?: string;
    model?: string | null;
    fallbackReason?: string | null;
  };
  error?: { message?: string };
};

const TERMINAL_STATUSES = new Set<NormalizedSession["status"]>([
  "completed",
  "timed_out",
  "interrupted",
  "failed",
]);

const DEMO_PRESETS = [
  {
    id: "healthcare",
    label: "Healthcare",
    url: "https://www.zocdoc.com",
    objective:
      "Find and start booking a routine doctor appointment, stopping before submitting real patient data.",
  },
  {
    id: "checkout",
    label: "Checkout",
    url: "https://demo.vercel.store",
    objective:
      "Find a product and reach checkout review, stopping before payment or order placement.",
  },
  {
    id: "booking",
    label: "Booking",
    url: "https://www.opentable.com",
    objective:
      "Find a restaurant reservation path, stopping before confirming a real reservation.",
  },
  {
    id: "saas",
    label: "SaaS Signup",
    url: "https://linear.app",
    objective:
      "Understand the product and find the signup or demo path, stopping before creating a real workspace.",
  },
] as const;

const DEFAULT_OBJECTIVE =
  "Find the primary user workflow and stop before an irreversible action.";

export default function Home() {
  const [snapshot, setSnapshot] = useState<RunSnapshot>(() => createDemoRun());
  const [targetUrl, setTargetUrl] = useState("https://demo-health.example");
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceLine, setVoiceLine] = useState("Voice ready when a finding is selected.");
  const [exportLine, setExportLine] = useState("Report package ready.");
  const [localizedHotspots, setLocalizedHotspots] = useState<VisualHotspot[] | null>(null);
  const [heatmapLine, setHeatmapLine] = useState("Heatmap uses deterministic placement until findings are localized.");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [persistenceLine, setPersistenceLine] = useState("Restoring any saved lab run...");
  const [persistenceHydrated, setPersistenceHydrated] = useState(false);
  const [hasRestoredSavedRun, setHasRestoredSavedRun] = useState(false);
  const [statusLine, setStatusLine] = useState(
    "Mock-first build: real H Company routes can swap in behind this contract.",
  );
  const pendingResultIds = useRef(new Set<string>());
  const lastReportKey = useRef<string | null>(null);
  const liveMode = snapshot.phase === "running";
  const panelFeedback = getPanelFeedback({ snapshot, loading, dispatching });
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
  const fallbackHotspots = useMemo(
    () => buildVisualHotspots(snapshot.sessions, snapshot.analysis),
    [snapshot.analysis, snapshot.sessions],
  );
  const visualHotspots = localizedHotspots ?? fallbackHotspots;
  const hotspotCounts = useMemo(
    () => summarizeHotspots(visualHotspots),
    [visualHotspots],
  );
  const heatmapDisplay = getHeatmapDisplay({
    hotspotCount: visualHotspots.length,
    heatmapLine,
    liveMode,
  });
  const runGuidance = getRunGuidance({ snapshot, loading, dispatching });
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

  const hotspotLocalizationKey = useMemo(
    () =>
      fallbackHotspots
        .map((hotspot) => `${hotspot.id}:${hotspot.evidence}:${hotspot.recommendation}`)
        .join("|"),
    [fallbackHotspots],
  );

  useEffect(() => {
    const saved = parsePersistedLabState(
      window.localStorage.getItem(PERSISTED_LAB_STATE_KEY),
    );

    if (saved) {
      setSnapshot(saved.snapshot);
      setTargetUrl(saved.targetUrl);
      setObjective(saved.objective);
      setSelectedPresetId(saved.selectedPresetId);
      setAuthorized(saved.authorized);
      setStatusLine(saved.statusLine);
      setPersistenceLine(`Restored saved run from ${new Date(saved.savedAt).toLocaleTimeString()}.`);
      setHasRestoredSavedRun(true);
    } else {
      setPersistenceLine("Autosave ready.");
    }

    setPersistenceHydrated(true);
  }, []);

  useEffect(() => {
    if (!persistenceHydrated) return;

    try {
      const persisted = buildPersistedLabState({
        snapshot,
        targetUrl,
        objective,
        selectedPresetId,
        authorized,
        statusLine,
      });
      window.localStorage.setItem(
        PERSISTED_LAB_STATE_KEY,
        JSON.stringify(persisted),
      );
      setPersistenceLine(
        `${hasRestoredSavedRun ? "Restored run" : "Run"} autosaved ${new Date(persisted.savedAt).toLocaleTimeString()}.`,
      );
    } catch {
      setPersistenceLine("Autosave paused until the URL is valid.");
    }
  }, [
    authorized,
    hasRestoredSavedRun,
    objective,
    persistenceHydrated,
    selectedPresetId,
    snapshot,
    statusLine,
    targetUrl,
  ]);

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

  useEffect(() => {
    if (!hotspotLocalizationKey || fallbackHotspots.length === 0) {
      setLocalizedHotspots(null);
      setHeatmapLine("Heatmap will localize once friction evidence exists.");
      return;
    }

    let cancelled = false;
    setLocalizedHotspots(null);
    setHeatmapLine("Localizing hotspot coordinates with model evidence...");

    async function localize() {
      try {
        const response = await fetch("/api/localize-hotspots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessions: snapshot.sessions,
            analysis: snapshot.analysis,
          }),
        });
        const payload = (await response.json()) as LocalizeHotspotsPayload;

        if (cancelled) return;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Hotspot localization failed.");
        }

        setLocalizedHotspots(payload.data);
        setHeatmapLine(
          payload.meta?.mode === "nvidia"
            ? `NVIDIA-localized heatmap (${payload.meta.model ?? "Nemotron"}).`
            : payload.meta?.mode === "openai"
              ? `Model-localized heatmap (${payload.meta.model ?? "OpenAI"}).`
            : `Fallback heatmap${payload.meta?.fallbackReason ? `: ${payload.meta.fallbackReason}` : "."}`,
        );
      } catch (error) {
        if (cancelled) return;
        setLocalizedHotspots(fallbackHotspots);
        setHeatmapLine(
          error instanceof Error
            ? `Fallback heatmap: ${error.message}`
            : "Fallback heatmap used.",
        );
      }
    }

    void localize();

    return () => {
      cancelled = true;
    };
  }, [fallbackHotspots, hotspotLocalizationKey, snapshot.analysis, snapshot.sessions]);

  async function handlePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatusLine("Generating the persona test plan before dispatch.");

    try {
      const response = await fetch("/api/generate-test-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          objective,
          authorizationConfirmed: authorized,
        }),
      });
      const payload = (await response.json()) as TestPlanPayload;

      if (!response.ok || !payload.data?.analysis) {
        throw new Error(payload.error?.message ?? "Could not generate a persona plan.");
      }

      const now = new Date().toISOString();
      setSnapshot((current) => ({
        ...current,
        id: `plan-${Date.now()}`,
        phase: "revealing",
        url: targetUrl,
        objective,
        analysis: payload.data?.analysis ?? current.analysis,
        sessions: [],
        selectedPersonaId: payload.data?.analysis?.personas[0]?.id ?? null,
        report: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      }));
      setLocalizedHotspots(null);
      setStatusLine(
        `Generated ${payload.data.analysis.personas.length} personas with ${payload.meta?.mode ?? "planner"}${payload.meta?.model ? ` (${payload.meta.model})` : ""}. Review them, then dispatch.`,
      );
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Could not generate a persona plan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunch() {
    setDispatching(true);
    const customPersona = snapshot.analysis?.personas.find((persona) =>
      persona.id.startsWith("custom-"),
    );
    setStatusLine(
      `Launching ${snapshot.analysis?.personas.length ?? 4} H Company computer-use sessions.`,
    );

    try {
      const response = await fetch("/api/run-h-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          objective,
          authorizationConfirmed: authorized,
          customPersona,
        }),
      });
      const payload = (await response.json()) as ApiRunPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not start analysis.");
      }

      pendingResultIds.current.clear();
      lastReportKey.current = null;
      setLocalizedHotspots(null);
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
      setDispatching(false);
    }
  }

  function handleCreatePersona(draft: PersonaDraft) {
    if (!snapshot.analysis) return;

    try {
      const customPersona = createCustomPersona({
        ...draft,
        objective: objective.trim() || DEFAULT_OBJECTIVE,
        globalSafetyBoundaries: snapshot.analysis.globalSafetyBoundaries,
      });

      setSnapshot((current) => {
        if (!current.analysis) return current;
        const generatedPersonas = current.analysis.personas.filter(
          (persona) => !persona.id.startsWith("custom-"),
        );
        return {
          ...current,
          analysis: {
            ...current.analysis,
            personas: [...generatedPersonas, customPersona],
          },
          selectedPersonaId: customPersona.id,
          updatedAt: new Date().toISOString(),
        };
      });
      setStatusLine(
        `${customPersona.displayName} joined the panel and will be dispatched to H Company.`,
      );
    } catch (error) {
      setStatusLine(
        error instanceof Error ? error.message : "Could not create the custom persona.",
      );
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
          ? `data:${payload.data.audioMime ?? "audio/wav"};base64,${payload.data.audioBase64}`
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

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(buildJudgeSummary(snapshot));
      setExportLine("Judge summary copied.");
    } catch {
      setExportLine("Clipboard unavailable. Use download instead.");
    }
  }

  function handleDownloadReport(kind: "markdown" | "json") {
    const content =
      kind === "markdown"
        ? buildMarkdownReport(snapshot)
        : buildReportJson(snapshot);
    const filename = `${slugify(snapshot.analysis?.productName ?? "grannysmith")}-report.${kind === "markdown" ? "md" : "json"}`;
    const mime = kind === "markdown" ? "text/markdown" : "application/json";
    downloadTextFile(filename, content, mime);
    setExportLine(`${kind === "markdown" ? "Markdown" : "JSON"} report downloaded.`);
  }

  function handleHotspotSelect(hotspot: VisualHotspot) {
    setSnapshot((current) => ({
      ...current,
      selectedPersonaId: hotspot.personaId,
    }));
    setDrawerOpen(true);
  }

  return (
    <>
      <section className="landing-hero">
        <nav aria-label="Primary navigation" className="landing-nav">
          <a className="brand" href="#top" aria-label="GrannySmith home">
            <span className="brand-mark">GS</span>
            <span>GrannySmith</span>
          </a>
          <div className="nav-links">
            <a href="#lab">Live lab</a>
            <a href="#results">Evidence</a>
            <a href="#safety">Safety</a>
          </div>
          <a className="nav-cta" href="#lab">
            Start testing <ArrowRight size={15} />
          </a>
        </nav>

        <div className="hero-layout" id="top">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={14} /> Synthetic usability lab</p>
            <h1>
              <span className="hero-title-line">Watch real-world</span>{" "}
              <span className="hero-title-line">personas</span>{" "}
              <em>test every path.</em>
            </h1>
            <p className="hero-description">
              Four computer-use agents explore your product as different people. See where they
              hesitate, backtrack, and succeed—then turn their evidence into a prioritized report.
            </p>
            <div className="hero-form" id="start">
              <a className="hero-start-button" href="#lab">
                <Play size={17} /> Open the live lab <ArrowRight size={16} />
              </a>
              <p><ShieldCheck size={14} /> Plan personas, dispatch H agents, inspect hotspots, and export the report.</p>
            </div>
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
            <span><b>{snapshot.analysis?.personas.length ?? 4}</b> personas</span>
            <span><b>{snapshot.sessions.reduce((total, session) => total + session.stepCount, 0)}</b> actions watched</span>
            <span><b>{visualHotspots.length}</b> shared signals</span>
          </div>
        </div>
      </section>

    <main className="lab-shell min-h-screen bg-paper px-5 py-16 text-ink md:px-8" id="lab">
      <section className="mx-auto mb-6 max-w-7xl rounded-lg border border-ink/12 bg-white/72 p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/42">
              Test workflow
            </p>
            <h2 className="mt-1 text-2xl font-black">Website to decision, in one run</h2>
          </div>
          <p className="text-sm font-semibold text-ink/55">
            Active: {runGuidance.steps.find((step) => step.id === runGuidance.activeStep)?.label}
          </p>
        </div>
        <ol className="mt-5 grid gap-2 md:grid-cols-5" aria-label="Usability test workflow">
          {runGuidance.steps.map((step, index) => (
            <li
              aria-current={step.status === "active" ? "step" : undefined}
              className={`rounded-md border p-3 transition ${
                step.status === "active"
                  ? "border-mint bg-mint/12 shadow-[0_10px_26px_rgba(98,196,155,0.16)]"
                  : step.status === "complete"
                    ? "border-ink/10 bg-ink/[0.035]"
                    : "border-ink/8 bg-white/50 opacity-60"
              }`}
              key={step.id}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${
                    step.status === "active"
                      ? "bg-mint text-ink"
                      : step.status === "complete"
                        ? "bg-ink text-paper"
                        : "bg-ink/8 text-ink/45"
                  }`}
                >
                  {step.status === "complete" ? "✓" : index + 1}
                </span>
                <p className="text-sm font-black">{step.label}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/55">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

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
                <p className="text-2xl font-black">GrannySmith</p>
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
            onSubmit={handlePlan}
          >
            <div>
              <p className="text-sm font-bold">Demo presets</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    className={`rounded-md border px-3 py-2 text-left text-sm font-black transition ${
                      selectedPresetId === preset.id
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/12 bg-white text-ink hover:border-ink/30"
                    }`}
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setTargetUrl(preset.url);
                      setObjective(preset.objective);
                      setStatusLine(`${preset.label} preset loaded. Generate the panel when ready.`);
                    }}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
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
                disabled={loading || dispatching || !authorized}
                type="submit"
              >
                <Play size={18} />
                {loading ? "Planning..." : "Generate Panel"}
              </button>
            </div>
            <label className="text-sm font-bold" htmlFor="objective">
              Test objective
            </label>
            <textarea
              className="min-h-24 rounded-md border border-ink/18 bg-white px-4 py-3 text-base leading-6"
              id="objective"
              onChange={(event) => {
                setObjective(event.target.value);
                setSelectedPresetId(null);
              }}
              value={objective}
            />
            <PersonaBuilder
              disabled={!snapshot.analysis || loading || dispatching || liveMode}
              onCreate={handleCreatePersona}
            />
            <section
              aria-live="polite"
              className={`rounded-lg border p-4 shadow-sm ${
                panelFeedback.tone === "ready"
                  ? "border-mint/45 bg-mint/12"
                  : panelFeedback.tone === "planning" || panelFeedback.tone === "dispatching"
                    ? "border-brass/45 bg-brass/12"
                    : panelFeedback.tone === "running"
                      ? "border-blue-400/40 bg-blue-100/45"
                      : panelFeedback.tone === "complete"
                        ? "border-ink/12 bg-white"
                        : "border-ink/10 bg-white/56"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/45">
                    Next step
                  </p>
                  <h3 className="mt-1 text-xl font-black">{panelFeedback.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    {panelFeedback.description}
                  </p>
                </div>
                <Sparkles
                  className={
                    panelFeedback.tone === "ready"
                      ? "text-mint"
                      : panelFeedback.tone === "planning" || panelFeedback.tone === "dispatching"
                        ? "animate-pulse text-brass"
                        : "text-ink/30"
                  }
                  size={24}
                />
              </div>
              {panelFeedback.personaNames.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {panelFeedback.personaNames.map((name) => (
                    <span
                      className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-black text-ink/70"
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
            <button
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-5 font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                panelFeedback.tone === "ready"
                  ? "border-mint bg-mint text-ink shadow-[0_12px_28px_rgba(98,196,155,0.22)] hover:-translate-y-0.5"
                  : "border-ink/18 bg-white text-ink"
              }`}
              disabled={loading || dispatching || !authorized || !snapshot.analysis}
              onClick={handleLaunch}
              type="button"
            >
              <Play size={18} />
              {panelFeedback.dispatchLabel}
            </button>
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mint/75">
              {persistenceLine}
            </p>
          </form>
        </div>

        <div className="grid min-h-[calc(100vh-3rem)] grid-rows-[1fr_auto] gap-5">
          <section className="relative overflow-hidden rounded-lg border border-ink/12 bg-[#202426] text-paper shadow-xl">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-paper/55">Live Lab</p>
                <h2 className="text-2xl font-black">
                  {snapshot.analysis?.personas.length ?? 4} testers, one product
                </h2>
              </div>
              <div className="rounded bg-mint px-3 py-1 text-sm font-black text-ink">
                {liveMode ? "Live H Mode" : "Demo Mode"}
              </div>
            </div>
            <div className="absolute left-5 right-5 top-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/12 bg-black/45 px-4 py-3 shadow-2xl backdrop-blur">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-mint">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-mint shadow-[0_0_18px_rgba(98,196,155,0.9)]" />
                  {heatmapDisplay.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-paper/70">
                  {heatmapDisplay.hint}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
                <span className="rounded-full bg-tomato px-3 py-1 text-white shadow-[0_0_22px_rgba(229,88,72,0.55)]">
                  {heatmapDisplay.countLabel}
                </span>
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-paper/70">
                  {heatmapDisplay.sourceLabel}
                </span>
              </div>
            </div>

            <div className="grid h-full min-h-[560px] grid-cols-2 gap-3 p-4 pt-40">
              {snapshot.analysis?.personas.map((persona) => {
                const session = sessionsByPersona.get(persona.id);
                const personaHotspots = visualHotspots.filter(
                  (hotspot) => hotspot.personaId === persona.id,
                );

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
                    {personaHotspots.length > 0 ? (
                      <div className="absolute -bottom-6 left-0 rounded bg-black/70 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-mint">
                        Heatmap
                      </div>
                    ) : null}
                    <HotspotLayer
                      hotspots={personaHotspots}
                      onSelect={handleHotspotSelect}
                    />
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

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {snapshot.analysis?.personas.map((persona) => (
              <article className="rounded-lg border border-ink/12 bg-white/72 p-4 shadow-sm" key={persona.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{persona.displayName}</p>
                    <p className="mt-1 text-sm font-semibold text-brass">{persona.tagline}</p>
                  </div>
                  <span className="rounded bg-ink/6 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink/55">
                    {persona.digitalConfidence}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/68">{persona.context}</p>
                <div className="mt-4 rounded-md border border-ink/10 bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">Task</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/72">{persona.task}</p>
                </div>
                <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-tomato/80">
                  Stop: {persona.stopConditions[0]}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-3" id="results">
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
          <p className="text-3xl font-black">{visualHotspots.length} hotspots</p>
          <p className="mt-2 text-sm text-ink/66">
            {hotspotSummary(hotspotCounts)}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink/70">
            Look in the Live Lab: the glowing numbered markers are the heatmap.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
            {heatmapLine}
          </p>
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
        <article className="rounded-lg border border-ink/12 bg-white/70 p-5 lg:col-span-2">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-ink/45">
                Export package
              </p>
              <p className="mt-2 text-lg font-black">
                {buildJudgeSummary(snapshot)}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink/45">
                {exportLine}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-paper"
                onClick={handleCopySummary}
                type="button"
              >
                <Clipboard size={16} />
                Copy Summary
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-black text-ink"
                onClick={() => handleDownloadReport("markdown")}
                type="button"
              >
                <Download size={16} />
                Markdown
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-black text-ink"
                onClick={() => handleDownloadReport("json")}
                type="button"
              >
                <Download size={16} />
                JSON
              </button>
            </div>
          </div>
        </article>

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

        <article className="rounded-lg border border-mint/45 bg-mint/10 p-5 lg:col-span-2">
          <div className="grid gap-5 lg:grid-cols-[0.68fr_1.32fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-mint/90">
                {runGuidance.nextAction.eyebrow}
              </p>
              <h3 className="mt-2 text-3xl font-black">{runGuidance.nextAction.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/68">
                {runGuidance.nextAction.detail}
              </p>
            </div>
            <div className="rounded-md border border-ink/10 bg-white/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">
                Highest-impact move
              </p>
              <p className="mt-2 text-base font-bold leading-7 text-ink/78">
                {runGuidance.nextAction.recommendation ??
                  "Complete the current step to unlock an evidence-backed recommendation."}
              </p>
            </div>
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
    <footer className="landing-footer" id="safety">
      <span>GrannySmith</span>
      <p>Synthetic usability benchmark—not a replacement for human research or accessibility certification.</p>
    </footer>
    </>
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

function HotspotLayer({
  hotspots,
  onSelect,
}: {
  hotspots: VisualHotspot[];
  onSelect: (hotspot: VisualHotspot) => void;
}) {
  if (hotspots.length === 0) return null;

  return (
    <div className="absolute inset-0 z-20">
      {hotspots.slice(0, 4).map((hotspot) => (
        <button
          aria-label={`${hotspot.category} hotspot: ${hotspot.evidence}`}
          className={`absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-sm font-black text-white shadow-2xl transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white ${hotspotClass(
            hotspot.severity,
          )}`}
          key={hotspot.id}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(hotspot);
          }}
          style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
          title={`${hotspot.label}: ${hotspot.recommendation}`}
          type="button"
        >
          <span className="absolute -inset-2 animate-ping rounded-full bg-white/35" />
          <span className="absolute -inset-1 rounded-full border border-white/45" />
          <span className="relative">{hotspot.severity}</span>
        </button>
      ))}
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

function hotspotClass(severity: number): string {
  if (severity >= 4) return "bg-tomato shadow-[0_0_34px_rgba(229,88,72,0.85)]";
  if (severity === 3) return "bg-brass shadow-[0_0_30px_rgba(191,131,45,0.8)]";
  return "bg-mint shadow-[0_0_28px_rgba(98,196,155,0.78)]";
}

function hotspotSummary(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "Friction heatmap appears as findings arrive.";
  return entries
    .slice(0, 3)
    .map(([category, count]) => `${count} ${category}`)
    .join(" · ");
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

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "grannysmith";
}
