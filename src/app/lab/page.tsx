"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Image from "next/image";
import { Activity, AlertTriangle, ArrowRight, Bot, Check, Clipboard, Download, ExternalLink, MousePointer2, Pause, Play, ShieldCheck, SkipBack, SkipForward, Sparkles, Volume2 } from "lucide-react";
import { AnimatedAgentJourney } from "@/components/animated-agent-journey";
import { PersonaBuilder, type PersonaDraft } from "@/components/persona-builder";
import {
  createLiveVoiceQueueItem,
  enqueueLiveVoiceItem,
  getLiveVoicePlaybackMode,
  getScreenNarrationCandidate,
  getReplayNarrationsForFrame,
  isLiveNarrationEligible,
  shouldSpeakCurrentNarrationOnEnable,
  shouldPrimeReplayNarration,
  shouldEnableLiveVoiceForDispatch,
  type ScreenNarrationEvent,
  type LiveVoiceQueueItem,
} from "@/lib/audio/live-voice-queue";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  buildVisualHotspots,
  summarizeHotspots,
  type VisualHotspot,
} from "@/lib/hotspots/build-hotspots";
import { buildLiveVisualHotspots } from "@/lib/hotspots/build-live-hotspots";
import { buildHeatmapDensityBlobs } from "@/lib/hotspots/build-heatmap-density";
import { buildReplayAttentionHotspots } from "@/lib/hotspots/build-replay-attention";
import {
  buildJudgeSummary,
  buildMarkdownReport,
  buildReportJson,
} from "@/lib/report/export-report";
import {
  buildLabSearchParams,
  buildPersistedLabState,
  clearPersistedLabState,
  parseLabSearchParams,
  parsePersistedLabState,
  PERSISTED_LAB_STATE_KEY,
  shouldRestorePersistedRun,
} from "@/lib/persistence/lab-state";
import {
  DEFAULT_TESTER_COUNT,
  getDispatchedPersonas,
  isTesterCount,
  TESTER_COUNT_OPTIONS,
  type TesterCount,
} from "@/lib/run/tester-count";
import type {
  NormalizedSession,
  RunSnapshot,
  UsabilityReport,
  VisualAgentState,
} from "@/lib/schemas/run";
import { getHeatmapDisplay } from "@/lib/ui/heatmap-display";
import { getPanelFeedback } from "@/lib/ui/panel-feedback";
import { createCustomPersona } from "@/lib/personas/create-custom-persona";
import type { CalibrationSession } from "@/lib/calibration/calibration";
import { calculateBehaviorOverlap } from "@/lib/calibration/calculate-overlap";
import { createCalibratedPersona } from "@/lib/calibration/create-calibrated-persona";
import {
  evidenceTypesFromSession,
  isUserSuppliedPersona,
  mergeCalibratedPersona,
} from "@/lib/calibration/lab-integration";
import { getRunGuidance } from "@/lib/ui/run-guidance";
import { buildPanelReviewItems } from "@/lib/ui/panel-review";
import { getLiveViewportPresentation } from "@/lib/ui/live-viewport";
import { canDispatchSuggestedPersonas } from "@/lib/ui/persona-approval";
import {
  getPersonaViewportFrames,
  mergeAgentRuntimeEvents,
  type AgentRuntimeEvent,
} from "@/lib/runtime/agent-events";
import {
  getAgentCursorForFrame,
} from "@/lib/runtime/agent-cursor";

type ApiRunPayload = {
  data?: RunSnapshot;
  meta?: {
    mode?: string;
    launchedCount?: number;
    requestedCount?: number;
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

type ScreenNarrationPayload = {
  data?: {
    source: "openai" | "fallback";
    text: string;
    x?: number;
    y?: number;
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
const DEFAULT_TARGET_URL = "https://demo-health.example";
const LAUNCHING_SESSION_PREFIX = "launching-";
const LIVE_EVENT_POLL_INTERVAL_MS = 1_800;
const SILENT_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAgICA";

export default function Home() {
  const [snapshot, setSnapshot] = useState<RunSnapshot>(() => createInitialRun());
  const [targetUrl, setTargetUrl] = useState(DEFAULT_TARGET_URL);
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [testerCount, setTesterCount] = useState<TesterCount>(DEFAULT_TESTER_COUNT);
  const [authorized, setAuthorized] = useState(true);
  const [personasAccepted, setPersonasAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceLine, setVoiceLine] = useState("Voice ready when a finding is selected.");
  const [liveVoiceEnabled, setLiveVoiceEnabled] = useState(false);
  const [liveVoiceLine, setLiveVoiceLine] = useState(
    "Enable live voice to hear screen action narration.",
  );
  const [exportLine, setExportLine] = useState("Report package ready.");
  const [localizedHotspots, setLocalizedHotspots] = useState<VisualHotspot[] | null>(null);
  const [heatmapLine, setHeatmapLine] = useState("Heatmap uses deterministic placement until findings are localized.");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [persistenceLine, setPersistenceLine] = useState("Restoring any saved lab run...");
  const [persistenceHydrated, setPersistenceHydrated] = useState(false);
  const [hasRestoredSavedRun, setHasRestoredSavedRun] = useState(false);
  const [fixRequestIds, setFixRequestIds] = useState<Set<string>>(() => new Set());
  const [liveEvents, setLiveEvents] = useState<AgentRuntimeEvent[]>([]);
  const [replayFrameIndex, setReplayFrameIndex] = useState<number | null>(null);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [activeCalibration, setActiveCalibration] = useState<CalibrationSession | null>(null);
  const [regressionLine, setRegressionLine] = useState("Guarded regression job ready.");
  const [statusLine, setStatusLine] = useState(
    "Mock-first build: real H Company routes can swap in behind this contract.",
  );
  const pendingResultIds = useRef(new Set<string>());
  const lastReportKey = useRef<string | null>(null);
  const liveEventCursors = useRef(new Map<string, number>());
  const liveVoiceEnabledRef = useRef(false);
  const liveVoiceQueueRef = useRef<LiveVoiceQueueItem[]>([]);
  const liveVoiceAudioCacheRef = useRef(new Map<string, LiveVoiceQueueItem>());
  const liveVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveVoicePlayingRef = useRef(false);
  const spokenLiveEventIds = useRef(new Set<string>());
  const screenNarratedEventIds = useRef(new Set<string>());
  const lastScreenNarrationAt = useRef(0);
  const replaySpokenEventIds = useRef(new Set<string>());
  const autoPlanFromUrl = useRef(false);
  const sessionsRef = useRef(snapshot.sessions);
  sessionsRef.current = snapshot.sessions;
  const liveMode = snapshot.phase === "running";
  const customPersonaCount =
    snapshot.analysis?.personas.filter(isUserSuppliedPersona).length ?? 0;
  const generatedPersonaCount =
    (snapshot.analysis?.personas.length ?? testerCount) - customPersonaCount;
  const selectedTesterCount = Math.min(testerCount, generatedPersonaCount) + customPersonaCount;
  const panelReady =
    snapshot.phase === "revealing" &&
    snapshot.sessions.length === 0 &&
    Boolean(snapshot.analysis);
  const canDispatch = canDispatchSuggestedPersonas({
    hasAnalysis: Boolean(snapshot.analysis),
    personasAccepted,
    authorized,
    loading,
    dispatching,
  });
  const activeSessions = useMemo(
    () =>
      snapshot.sessions.filter(
        (session) => !TERMINAL_STATUSES.has(session.status),
      ),
    [snapshot.sessions],
  );
  const runComplete = snapshot.sessions.length > 0 && activeSessions.length === 0;
  const sessionKey = snapshot.sessions
    .map((session) => `${session.sessionId}:${session.personaId}`)
    .join("|");
  const activeSessionKey = activeSessions
    .filter((session) => !session.sessionId.startsWith(LAUNCHING_SESSION_PREFIX))
    .map((session) => `${session.sessionId}:${session.personaId}`)
    .join("|");
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
  const liveHotspots = useMemo(
    () =>
      buildLiveVisualHotspots(
        liveEvents.flatMap((event) =>
          event.type === "frustration" &&
          event.category &&
          event.severity &&
          event.observation &&
          event.visibleEvidence &&
          event.recommendation
            ? [{
                id: event.id,
                personaId: event.personaId,
                step: event.step,
                category: event.category,
                severity: event.severity,
                observation: event.observation,
                visibleEvidence: event.visibleEvidence,
                recommendation: event.recommendation,
                x: event.x,
                y: event.y,
              }]
            : [],
        ),
        snapshot.analysis,
      ),
    [liveEvents, snapshot.analysis],
  );
  const displayedHotspots = useMemo(() => {
    const liveIds = new Set(liveHotspots.map((hotspot) => hotspot.id));
    return [...liveHotspots, ...visualHotspots.filter((hotspot) => !liveIds.has(hotspot.id))];
  }, [liveHotspots, visualHotspots]);
  const hotspotCounts = useMemo(
    () => summarizeHotspots(visualHotspots),
    [visualHotspots],
  );
  const heatmapDisplay = getHeatmapDisplay({
    hotspotCount: visualHotspots.length,
    heatmapLine,
    liveMode,
    panelReady,
  });
  const panelFeedback = getPanelFeedback({ snapshot, loading, dispatching, testerCount });
  const runGuidance = getRunGuidance({ snapshot, loading, dispatching });
  const panelReviewItems = useMemo(
    () => buildPanelReviewItems({
      analysis: snapshot.analysis,
      testerCount,
      selectedPersonaId: snapshot.selectedPersonaId,
    }),
    [snapshot.analysis, snapshot.selectedPersonaId, testerCount],
  );
  const sessionsByPersona = new Map(
    snapshot.sessions.map((session) => [session.personaId, session])
  );
  const dispatchedPersonas = useMemo(
    () => getDispatchedPersonas(snapshot.analysis, snapshot.sessions),
    [snapshot.analysis, snapshot.sessions],
  );
  const selectedPersona =
    snapshot.analysis?.personas.find((persona) => persona.id === snapshot.selectedPersonaId) ??
    snapshot.analysis?.personas[0];
  const selectedSession =
    snapshot.sessions.find((session) => session.personaId === selectedPersona?.id) ??
    snapshot.sessions.find((session) => session.personaId === snapshot.selectedPersonaId) ??
    snapshot.sessions[0];
  const calibratedRunSession = activeCalibration
    ? snapshot.sessions.find(
        (session) => session.personaId === `calibrated-${activeCalibration.id}`,
      )
    : undefined;
  const behaviorOverlap = useMemo(
    () =>
      activeCalibration
        ? calculateBehaviorOverlap(
            activeCalibration.evidence,
            evidenceTypesFromSession(calibratedRunSession),
          )
        : null,
    [activeCalibration, calibratedRunSession],
  );
  const viewportFrames = useMemo(
    () => getPersonaViewportFrames(liveEvents, selectedPersona?.id),
    [liveEvents, selectedPersona?.id],
  );
  const replayNarrationEvents = useMemo(() => {
    const runtimeNarrations = liveEvents.filter(
      (event) =>
        event.type === "narration" &&
        event.personaId === selectedPersona?.id &&
        Boolean(event.text?.trim()),
    );
    if (runtimeNarrations.length > 0) return runtimeNarrations;

    return (selectedSession?.finding?.frictionEvents ?? []).map(
      (friction, index) => {
        const matchingFrame =
          viewportFrames.find((frame) => frame.step >= friction.step) ??
          viewportFrames.at(-1);
        return {
          id: `replay-finding-${selectedSession?.sessionId ?? "session"}-${index}`,
          personaId: selectedPersona?.id ?? "unknown",
          type: "narration" as const,
          cursor: matchingFrame?.cursor ?? friction.step,
          text: friction.narratedObservation || friction.observation,
        };
      },
    );
  }, [liveEvents, selectedPersona?.id, selectedSession, viewportFrames]);
  const lastViewportFrameIndex = Math.max(0, viewportFrames.length - 1);
  const activeViewportFrameIndex =
    replayFrameIndex === null
      ? lastViewportFrameIndex
      : Math.min(replayFrameIndex, lastViewportFrameIndex);
  const liveViewport = viewportFrames[activeViewportFrameIndex];
  const eventCursorLimit =
    replayFrameIndex === null ? Number.POSITIVE_INFINITY : liveViewport?.cursor ?? 0;
  const previousReplayCursor =
    replayFrameIndex !== null && activeViewportFrameIndex > 0
      ? viewportFrames[activeViewportFrameIndex - 1]?.cursor ?? null
      : null;
  const isEventInReplayFrame = useCallback(
    (event: { cursor: number }) =>
      replayFrameIndex === null ||
      (event.cursor <= eventCursorLimit &&
        (previousReplayCursor === null || event.cursor > previousReplayCursor)),
    [eventCursorLimit, previousReplayCursor, replayFrameIndex],
  );
  const liveNarration = [...liveEvents].reverse().find(
    (event) =>
      event.type === "narration" &&
      event.personaId === selectedPersona?.id &&
      isEventInReplayFrame(event),
  );
  const liveFrustration = [...liveEvents].reverse().find(
    (event) =>
      event.type === "frustration" &&
      event.personaId === selectedPersona?.id &&
      isEventInReplayFrame(event),
  );
  const selectedSummaryHotspots = displayedHotspots.filter(
    (hotspot) => hotspot.personaId === selectedPersona?.id,
  );
  const replayAttentionHotspots = useMemo(
    () =>
      replayFrameIndex === null
        ? []
        : buildReplayAttentionHotspots(
            liveEvents,
            selectedPersona?.id,
            previousReplayCursor,
            eventCursorLimit,
          ),
    [eventCursorLimit, liveEvents, previousReplayCursor, replayFrameIndex, selectedPersona?.id],
  );
  const selectedHotspots =
    replayFrameIndex === null ? selectedSummaryHotspots : replayAttentionHotspots;
  const agentCursorPoint = selectedPersona
    ? getAgentCursorForFrame({
        events: liveEvents,
        personaId: selectedPersona.id,
        frameCursor: eventCursorLimit,
        fallback: null,
      })
    : null;
  const liveViewportPresentation = getLiveViewportPresentation({
    hasLiveViewport: Boolean(liveViewport),
    hotspotCount: selectedHotspots.length,
  });
  const hasLiveNarration = Boolean(liveNarration?.text);
  const selectedNarration =
    liveNarration?.text ??
    (replayFrameIndex === null
      ? selectedSession?.finding?.frictionEvents[0]?.narratedObservation ??
        selectedSession?.finding?.summary
      : liveViewport?.imageUrl
        ? `${selectedPersona?.displayName ?? "The agent"} is moving through this screen.`
        : null) ??
    selectedPersona?.introLine ??
    "No persona finding is ready yet.";
  const selectedFriction = liveFrustration ? {step:liveFrustration.step,category:liveFrustration.category??"clarity",severity:liveFrustration.severity??3,observation:liveFrustration.observation??"Usability barrier",visibleEvidence:liveFrustration.visibleEvidence??"Live agent evidence",recommendation:liveFrustration.recommendation??"Remove this barrier",narratedObservation:liveFrustration.observation??"This is frustrating",recovered:false} : replayFrameIndex === null ? selectedSession?.finding?.frictionEvents[0] ?? null : null;

  const generatePlan = useCallback(async (
    statusMessage = "Generating the persona test plan before dispatch.",
  ) => {
    setLoading(true);
    setStatusLine(statusMessage);

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
      const plannedAnalysis = activeCalibration
        ? mergeCalibratedPersona(
            payload.data.analysis,
            createCalibratedPersona(activeCalibration),
          )
        : payload.data.analysis;
      setSnapshot((current) => ({
        ...current,
        id: `plan-${Date.now()}`,
        phase: "revealing",
        url: targetUrl,
        objective,
        analysis: plannedAnalysis,
        sessions: [],
        selectedPersonaId: activeCalibration
          ? `calibrated-${activeCalibration.id}`
          : plannedAnalysis.personas[0]?.id ?? null,
        report: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      }));
      setPersonasAccepted(false);
      setLocalizedHotspots(null);
      setStatusLine(
        `Generated ${plannedAnalysis.personas.length} personas${activeCalibration ? ", including the approved behavioral proxy," : ""} with ${payload.meta?.mode ?? "planner"}${payload.meta?.model ? ` (${payload.meta.model})` : ""}. Review them, then dispatch.`,
      );
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Could not generate a persona plan.");
    } finally {
      setLoading(false);
    }
  }, [activeCalibration, authorized, objective, targetUrl]);

  const stopLiveVoicePlayback = useCallback((message?: string) => {
    liveVoiceQueueRef.current = [];
    liveVoicePlayingRef.current = false;
    const audio = liveVoiceAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (message) setLiveVoiceLine(message);
  }, []);

  const synthesizeVoiceItem = useCallback(async ({
    eventId,
    personaId,
    voiceSlot,
    text,
  }: {
    eventId: string;
    personaId: string;
    voiceSlot: 0 | 1 | 2 | 3;
    text: string;
  }): Promise<LiveVoiceQueueItem | null> => {
    const cached = liveVoiceAudioCacheRef.current.get(eventId);
    if (cached) return cached;

    const fallback = createLiveVoiceQueueItem({
      eventId,
      audioSrc: null,
      transcript: text,
    });
    try {
      const response = await fetch("/api/voice-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, voiceSlot, text }),
      });
      const payload = (await response.json()) as VoiceReactionPayload;
      const audioSrc = payload.data?.audioBase64
        ? `data:${payload.data.audioMime ?? "audio/wav"};base64,${payload.data.audioBase64}`
        : payload.data?.audioUrl;
      const item = response.ok && payload.data?.transcript
        ? createLiveVoiceQueueItem({
            eventId,
            audioSrc: audioSrc ?? null,
            transcript: payload.data.transcript,
          })
        : fallback;
      if (item) liveVoiceAudioCacheRef.current.set(eventId, item);
      return item;
    } catch {
      if (fallback) liveVoiceAudioCacheRef.current.set(eventId, fallback);
      return fallback;
    }
  }, []);

  const playNextLiveVoiceItem = useCallback(function playNextLiveVoiceItem() {
    if (!liveVoiceEnabledRef.current || liveVoicePlayingRef.current) return;
    const next = liveVoiceQueueRef.current.shift();
    if (!next) {
      setLiveVoiceLine(
        `Watching ${selectedPersona?.displayName ?? "the selected persona"}'s screen...`,
      );
      return;
    }

    liveVoicePlayingRef.current = true;
    const playbackMode = getLiveVoicePlaybackMode(next);
    setLiveVoiceLine(
      `${playbackMode === "browser-speech" ? "Browser speaking" : "Gradium speaking"}: “${next.transcript}”`,
    );

    const finish = () => {
      liveVoicePlayingRef.current = false;
      playNextLiveVoiceItem();
    };

    if (playbackMode === "browser-speech") {
      if (!("speechSynthesis" in window)) {
        setLiveVoiceLine("No speech engine is available in this browser.");
        finish();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(next.transcript);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.onend = finish;
      utterance.onerror = () => {
        setLiveVoiceLine("Browser speech failed. Try narrating the screen again.");
        finish();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return;
    }

    const audio = liveVoiceAudioRef.current ?? new Audio();
    liveVoiceAudioRef.current = audio;
    audio.volume = 1;
    audio.src = next.audioSrc!;
    audio.onended = () => {
      audio.onended = null;
      audio.onerror = null;
      finish();
    };
    audio.onerror = () => {
      setLiveVoiceLine("Could not play that reaction. Listening for the next one...");
      finish();
    };
    void audio.play().catch(() => {
      liveVoiceEnabledRef.current = false;
      setLiveVoiceEnabled(false);
      stopLiveVoicePlayback("Playback was blocked. Click Enable live voice again.");
    });
  }, [selectedPersona?.displayName, stopLiveVoicePlayback]);

  const queueLiveVoiceItem = useCallback((item: LiveVoiceQueueItem) => {
    liveVoiceQueueRef.current = enqueueLiveVoiceItem(
      liveVoiceQueueRef.current,
      item,
      2,
    );
    setLiveVoiceLine(
      liveVoicePlayingRef.current
        ? `${liveVoiceQueueRef.current.length} reaction${liveVoiceQueueRef.current.length === 1 ? "" : "s"} queued.`
        : "Starting live reaction...",
    );
    playNextLiveVoiceItem();
  }, [playNextLiveVoiceItem]);

  const handleLiveVoiceToggle = useCallback(async () => {
    if (liveVoiceEnabledRef.current) {
      liveVoiceEnabledRef.current = false;
      setLiveVoiceEnabled(false);
      stopLiveVoicePlayback("Live voice is off.");
      return;
    }

    const audio = liveVoiceAudioRef.current ?? new Audio();
    liveVoiceAudioRef.current = audio;
    audio.src = SILENT_AUDIO_DATA_URL;
    audio.volume = 0;

    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      audio.removeAttribute("src");
      liveVoiceEnabledRef.current = true;
      setLiveVoiceEnabled(true);
      setLiveVoiceLine(
        `Watching ${selectedPersona?.displayName ?? "the selected persona"}'s screen...`,
      );
      if (!liveViewport?.imageUrl && shouldSpeakCurrentNarrationOnEnable({
        runComplete,
        selectedPersonaId: selectedPersona?.id,
        narration: selectedNarration,
      }) && selectedPersona) {
        setLiveVoiceLine(`No screen frame is available, so preparing ${selectedPersona.displayName}'s finding...`);
        const voiceItem = await synthesizeVoiceItem({
          eventId: `voice-enable:${selectedSession?.sessionId ?? selectedPersona.id}:${selectedNarration}`,
          personaId: selectedPersona.id,
          voiceSlot: selectedPersona.voiceSlot,
          text: selectedNarration,
        });
        if (voiceItem) queueLiveVoiceItem(voiceItem);
        else setLiveVoiceLine("Could not prepare speech. Try narrating the screen again.");
      }
    } catch {
      liveVoiceEnabledRef.current = false;
      setLiveVoiceEnabled(false);
      setLiveVoiceLine("Your browser blocked audio. Allow sound, then try again.");
    }
  }, [
    queueLiveVoiceItem,
    liveViewport?.imageUrl,
    runComplete,
    selectedNarration,
    selectedPersona,
    selectedSession?.sessionId,
    stopLiveVoicePlayback,
    synthesizeVoiceItem,
  ]);

  const handleReplayToggle = useCallback(async () => {
    if (replayPlaying) {
      setReplayPlaying(false);
      stopLiveVoicePlayback("Replay paused. Live voice remains enabled.");
      return;
    }

    if (!liveVoiceEnabledRef.current) {
      await handleLiveVoiceToggle();
    }
    if (!liveVoiceEnabledRef.current) return;

    replaySpokenEventIds.current.clear();
    screenNarratedEventIds.current.clear();
    lastScreenNarrationAt.current = 0;
    stopLiveVoicePlayback("Preparing synchronized replay narration...");
    const replayStartFrame = activeViewportFrameIndex >= viewportFrames.length - 1
      ? viewportFrames[0]
      : liveViewport;
    if (activeViewportFrameIndex >= viewportFrames.length - 1) {
      setReplayFrameIndex(0);
    }
    setReplayPlaying(true);
    if (shouldPrimeReplayNarration({
      enabled: liveVoiceEnabledRef.current,
      frameCount: viewportFrames.length,
      selectedPersonaId: selectedPersona?.id,
      hasViewportImage: Boolean(replayStartFrame?.imageUrl),
    })) {
      setLiveVoiceLine(`Preparing ${selectedPersona?.displayName ?? "the selected persona"}'s screen narration...`);
    }
  }, [
    activeViewportFrameIndex,
    handleLiveVoiceToggle,
    liveViewport,
    replayPlaying,
    selectedPersona?.id,
    selectedPersona?.displayName,
    stopLiveVoicePlayback,
    viewportFrames,
  ]);
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
    setReplayFrameIndex(null);
    setReplayPlaying(false);
    replaySpokenEventIds.current.clear();
  }, [selectedPersona?.id]);

  useEffect(() => {
    if (!replayPlaying || viewportFrames.length < 2) return;

    const timer = window.setInterval(() => {
      setReplayFrameIndex((current) => {
        const next = (current ?? 0) + 1;
        if (next >= viewportFrames.length) {
          setReplayPlaying(false);
          return viewportFrames.length - 1;
        }
        return next;
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [replayPlaying, viewportFrames.length]);

  useEffect(() => {
    if (
      !replayPlaying ||
      !liveVoiceEnabledRef.current ||
      !selectedPersona ||
      !liveViewport
    ) {
      return;
    }
    if (liveViewport.imageUrl) return;

    const previousCursor =
      activeViewportFrameIndex > 0
        ? viewportFrames[activeViewportFrameIndex - 1]?.cursor ?? null
        : null;
    const narrations = getReplayNarrationsForFrame({
      events: replayNarrationEvents,
      personaId: selectedPersona.id,
      previousCursor,
      currentCursor: liveViewport.cursor,
      playedEventIds: replaySpokenEventIds.current,
    });

    for (const narration of narrations) {
      replaySpokenEventIds.current.add(narration.id);
      void synthesizeVoiceItem({
        eventId: narration.id,
        personaId: selectedPersona.id,
        voiceSlot: selectedPersona.voiceSlot,
        text: narration.text ?? "",
      })
        .then((voiceItem) => {
          if (voiceItem && liveVoiceEnabledRef.current) {
            queueLiveVoiceItem(voiceItem);
          }
        })
        .catch(() => {
          setLiveVoiceLine("Replay fallback narration failed. Continuing visual replay...");
        });
    }
  }, [
    activeViewportFrameIndex,
    liveViewport,
    queueLiveVoiceItem,
    replayNarrationEvents,
    replayPlaying,
    selectedPersona,
    synthesizeVoiceItem,
    viewportFrames,
  ]);

  useEffect(() => {
    if (
      snapshot.sessions.length === 0 ||
      !liveVoiceEnabled ||
      !selectedPersona ||
      !liveViewport?.imageUrl
    ) {
      return;
    }

    const eventsAtCurrentFrame = liveEvents.filter(
      (event) =>
        event.id === liveViewport.id ||
        (event.personaId === selectedPersona.id &&
          event.type === "narration" &&
          event.cursor === liveViewport.cursor),
    );
    const candidate = getScreenNarrationCandidate({
      enabled: liveVoiceEnabledRef.current,
      events: eventsAtCurrentFrame,
      selectedPersonaId: selectedPersona.id,
      processedEventIds: screenNarratedEventIds.current,
    });
    if (!candidate?.imageUrl) return;
    const now = Date.now();
    const narrationCooldownMs = replayPlaying ? 2_500 : 6_000;
    if (now - lastScreenNarrationAt.current < narrationCooldownMs) return;
    lastScreenNarrationAt.current = now;
    screenNarratedEventIds.current.add(candidate.id);
    const narrationId = `screen-narration:${candidate.id}`;
    let cancelled = false;

    setLiveVoiceLine(`Reading what ${selectedPersona.displayName} sees...`);
    void fetch("/api/screen-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: candidate.imageUrl,
        personaName: selectedPersona.displayName,
        personaDescription: `${selectedPersona.tagline}. ${selectedPersona.context}. ${selectedPersona.behaviors.join(" ")}`,
        objective: snapshot.objective ?? objective,
        currentUrl: candidate.currentUrl ?? snapshot.url,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as ScreenNarrationPayload;
        if (!response.ok || !payload.data?.text || cancelled) return null;
        const narrationText = payload.data.text;
        const narrationEvent: AgentRuntimeEvent = {
          id: narrationId,
          sessionId: candidate.sessionId ?? selectedSession?.sessionId ?? candidate.id,
          personaId: selectedPersona.id,
          cursor: candidate.cursor,
          step: candidate.step ?? candidate.cursor,
          createdAt: new Date().toISOString(),
          type: "narration",
          text: narrationText,
          emotion: "observing",
          ...(typeof payload.data.x === "number" && typeof payload.data.y === "number"
            ? {
                x: payload.data.x,
                y: payload.data.y,
                coordinateSource: "vision" as const,
              }
            : {}),
        };
        const voiceItem = await synthesizeVoiceItem({
          eventId: narrationId,
          personaId: selectedPersona.id,
          voiceSlot: selectedPersona.voiceSlot,
          text: narrationText,
        });
        return { narrationEvent, voiceItem };
      })
      .then((result) => {
        if (result && !cancelled && liveVoiceEnabledRef.current) {
          setLiveEvents((current) =>
            mergeAgentRuntimeEvents(current, [result.narrationEvent]),
          );
          if (result.voiceItem) queueLiveVoiceItem(result.voiceItem);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveVoiceLine("Could not narrate this frame. Watching for the next one...");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    liveEvents,
    liveVoiceEnabled,
    liveViewport,
    objective,
    queueLiveVoiceItem,
    replayPlaying,
    selectedPersona,
    selectedSession?.sessionId,
    snapshot.objective,
    snapshot.sessions.length,
    snapshot.url,
    synthesizeVoiceItem,
  ]);

  useEffect(() => {
    const calibrationId = new URLSearchParams(window.location.search).get(
      "calibration",
    );
    if (!calibrationId) return;
    let cancelled = false;

    fetch(`/api/calibrations/${encodeURIComponent(calibrationId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: CalibrationSession };
        if (!response.ok || !payload.data || payload.data.status !== "approved") {
          throw new Error("Calibration is missing or not approved.");
        }
        if (!cancelled) {
          setActiveCalibration(payload.data);
          setTargetUrl(payload.data.targetUrl);
          setObjective(payload.data.objective);
          setStatusLine(
            `${payload.data.testerName}'s approved behavioral proxy is ready to join the panel.`,
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusLine("Could not load the approved calibration profile.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const queryState = parseLabSearchParams(window.location.search);
    const hasQueryState = Object.keys(queryState).length > 0;
    const saved = parsePersistedLabState(
      window.localStorage.getItem(PERSISTED_LAB_STATE_KEY),
    );

    if (queryState.realRun) {
      autoPlanFromUrl.current = true;
      setSnapshot(createInitialRun());
      setTargetUrl(queryState.targetUrl ?? DEFAULT_TARGET_URL);
      setObjective(queryState.objective ?? DEFAULT_OBJECTIVE);
      setSelectedPresetId(null);
      setTesterCount(queryState.testerCount ?? DEFAULT_TESTER_COUNT);
      setAuthorized(true);
      setPersonasAccepted(false);
      setLocalizedHotspots(null);
      setLiveEvents([]);
      setReplayFrameIndex(null);
      setReplayPlaying(false);
      setStatusLine("Preparing a real run from the URL. H agents will start only after Dispatch.");
      setPersistenceLine("Loaded real-run configuration from the URL.");
      setHasRestoredSavedRun(false);
    } else if (saved && shouldRestorePersistedRun(saved, queryState)) {
      autoPlanFromUrl.current = false;
      setSnapshot(saved.snapshot);
      setTargetUrl(saved.targetUrl);
      setObjective(saved.objective);
      setSelectedPresetId(saved.selectedPresetId);
      setTesterCount(isTesterCount(saved.testerCount) ? saved.testerCount : 4);
      setAuthorized(saved.authorized);
      setPersonasAccepted(saved.personasAccepted);
      setStatusLine(saved.statusLine);
      setPersistenceLine(`Restored saved run from ${new Date(saved.savedAt).toLocaleTimeString()}.`);
      setHasRestoredSavedRun(true);
    } else if (hasQueryState) {
      autoPlanFromUrl.current = false;
      setPersonasAccepted(false);
      if (queryState.targetUrl) setTargetUrl(queryState.targetUrl);
      if (queryState.objective) setObjective(queryState.objective);
      if (queryState.testerCount) setTesterCount(queryState.testerCount);
      setPersistenceLine("Loaded test configuration from the URL.");
    } else {
      autoPlanFromUrl.current = false;
      setPersistenceLine("Autosave ready.");
    }

    setPersistenceHydrated(true);
  }, []);

  useEffect(() => {
    if (
      !persistenceHydrated ||
      !autoPlanFromUrl.current ||
      loading ||
      snapshot.analysis ||
      snapshot.sessions.length > 0
    ) {
      return;
    }

    autoPlanFromUrl.current = false;
    void generatePlan("Generating a real persona plan from the share link.");
  }, [
    generatePlan,
    loading,
    persistenceHydrated,
    snapshot.analysis,
    snapshot.sessions.length,
  ]);

  useEffect(() => {
    if (!persistenceHydrated) return;

    try {
      const search = buildLabSearchParams({
        targetUrl,
        objective,
        testerCount,
      });
      const params = new URLSearchParams(search);
      const calibrationId =
        activeCalibration?.id ??
        new URLSearchParams(window.location.search).get("calibration");
      if (calibrationId) params.set("calibration", calibrationId);
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get("run") === "1") params.set("run", "1");
      if (currentParams.get("live") === "1") params.set("live", "1");
      const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl !== currentUrl) {
        window.history.replaceState(window.history.state, "", nextUrl);
      }
    } catch {
      // Keep the last valid share URL while the form is temporarily incomplete.
    }
  }, [activeCalibration?.id, objective, persistenceHydrated, targetUrl, testerCount]);

  useEffect(() => {
    if (!persistenceHydrated) return;

    try {
      const persisted = buildPersistedLabState({
        snapshot,
        targetUrl,
        objective,
        selectedPresetId,
        testerCount,
        authorized,
        personasAccepted,
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
    personasAccepted,
    persistenceHydrated,
    selectedPresetId,
    snapshot,
    statusLine,
    testerCount,
    targetUrl,
  ]);

  useEffect(() => {
    return () => {
      liveVoiceEnabledRef.current = false;
      liveVoiceQueueRef.current = [];
      const audio = liveVoiceAudioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
    };
  }, []);

  useEffect(() => {
    if (!liveVoiceEnabledRef.current) return;
    stopLiveVoicePlayback(
      `Watching ${selectedPersona?.displayName ?? "the selected persona"}'s screen...`,
    );
  }, [
    selectedPersona?.displayName,
    selectedPersona?.id,
    stopLiveVoicePlayback,
  ]);

  useEffect(() => {
    if (!liveMode || !activeSessionKey) return;

    let cancelled = false;

    async function pollSessions() {
      const targets = sessionsRef.current.filter(
        (session) =>
          !TERMINAL_STATUSES.has(session.status) &&
          !session.sessionId.startsWith(LAUNCHING_SESSION_PREFIX),
      );
      const updates = await Promise.all(
        targets.map(async (session) => {
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
  }, [activeSessionKey, liveMode]);
  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;

    async function poll() {
      const sessions = sessionsRef.current.filter(
        (session) => !session.sessionId.startsWith(LAUNCHING_SESSION_PREFIX),
      );
      const batches = await Promise.all(
        sessions.map(async (session) => {
          const after = liveEventCursors.current.get(session.sessionId) ?? 0;
          const query = new URLSearchParams({
            sessionId: session.sessionId,
            personaId: session.personaId,
            after: String(after),
            events: "1",
          });
          try {
            const response = await fetch(`/api/session-status?${query}`);
            const payload = (await response.json()) as {
              data?: AgentRuntimeEvent[];
              meta?: { cursor?: number };
            };
            liveEventCursors.current.set(
              session.sessionId,
              payload.meta?.cursor ?? after,
            );
            return payload.data ?? [];
          } catch {
            return [];
          }
        }),
      );
      if (cancelled) return;

      const incoming = batches.flat();
      if (incoming.length === 0) return;
      setLiveEvents((current) => mergeAgentRuntimeEvents(current, incoming));

      for (const event of incoming) {
        const persona = snapshot.analysis?.personas.find(
          (item) => item.id === event.personaId,
        );
        const session = sessionsRef.current.find(
          (item) => item.personaId === event.personaId,
        );
        if (!persona || !session) continue;

        if (isLiveNarrationEligible({
          enabled: liveVoiceEnabledRef.current,
          eventId: event.id,
          eventType: event.type,
          eventPersonaId: event.personaId,
          selectedPersonaId: selectedPersona?.id,
          text: event.text,
          spokenEventIds: spokenLiveEventIds.current,
        })) {
          spokenLiveEventIds.current.add(event.id);
          try {
            const voiceItem = await synthesizeVoiceItem({
              eventId: event.id,
              personaId: persona.id,
              voiceSlot: persona.voiceSlot,
              text: event.text ?? "",
            });
            if (voiceItem) {
              queueLiveVoiceItem(voiceItem);
            } else {
              setLiveVoiceLine("Gradium did not return audio. Watching for the next screen action...");
            }
          } catch {
            setLiveVoiceLine("Live voice request failed. Watching for the next screen action...");
          }
        }

        if (event.type === "frustration") {
          const friction = {
            step: event.step,
            category: event.category ?? "clarity",
            severity: event.severity ?? 3,
            observation: event.observation ?? "Barrier",
            visibleEvidence: event.visibleEvidence ?? "Live evidence",
            recommendation: event.recommendation ?? "Remove barrier",
            narratedObservation: event.observation ?? "This is frustrating",
            recovered: false,
          };
          await fetch("/api/report?fixJob=1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: snapshot.id,
              sessionId: session.sessionId,
              personaId: persona.id,
              personaName: persona.displayName,
              productUrl: event.currentUrl ?? snapshot.url,
              objective: snapshot.objective ?? objective,
              frustrationEventId: event.id,
              frustration: friction,
            }),
          });
          setFixRequestIds((current) => new Set(current).add(event.id));
        }
      }
    }

    const timer = window.setInterval(poll, LIVE_EVENT_POLL_INTERVAL_MS);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    objective,
    queueLiveVoiceItem,
    selectedPersona?.id,
    snapshot.analysis?.personas,
    snapshot.id,
    snapshot.objective,
    synthesizeVoiceItem,
    sessionKey,
    snapshot.url,
  ]);

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
    await generatePlan();
  }

  async function handleLaunch() {
    if (!snapshot.analysis || !canDispatch) return;
    if (shouldEnableLiveVoiceForDispatch(liveVoiceEnabledRef.current)) {
      await handleLiveVoiceToggle();
    }
    setDispatching(true);
    const beforeLaunch = snapshot;
    const customPersona = snapshot.analysis?.personas.find(isUserSuppliedPersona);
    const generatedPersonas = snapshot.analysis.personas
      .filter((persona) => !isUserSuppliedPersona(persona))
      .slice(0, testerCount);
    const customPersonas = snapshot.analysis.personas.filter(isUserSuppliedPersona);
    const personasToLaunch = [...generatedPersonas, ...customPersonas];
    const startedAt = new Date().toISOString();
    const launchingSessions: NormalizedSession[] = personasToLaunch.map(
      (persona) => ({
        sessionId: `${LAUNCHING_SESSION_PREFIX}${persona.id}`,
        personaId: persona.id,
        status: "queued",
        visualState: "launching",
        eventCursor: 0,
        stepCount: 0,
        startedAt,
        finishedAt: null,
        agentViewUrl: null,
        outcome: "unknown",
        latestActionLabel: "Requesting H Company session",
        finding: null,
        errorCode: null,
      }),
    );
    liveEventCursors.current.clear();
    spokenLiveEventIds.current.clear();
    screenNarratedEventIds.current.clear();
    lastScreenNarrationAt.current = 0;
    replaySpokenEventIds.current.clear();
    liveVoiceAudioCacheRef.current.clear();
    stopLiveVoicePlayback(
      liveVoiceEnabledRef.current
        ? `Watching ${personasToLaunch[0]?.displayName ?? "the selected persona"}'s screen...`
        : "Enable live voice to hear screen action narration.",
    );
    setLiveEvents([]);
    setSnapshot((current) => ({
      ...current,
      phase: "running",
      sessions: launchingSessions,
      selectedPersonaId: personasToLaunch[0]?.id ?? null,
      report: null,
      error: null,
      updatedAt: startedAt,
    }));
    setStatusLine(
      `Launching ${selectedTesterCount} H Company computer-use session${selectedTesterCount === 1 ? "" : "s"}.`,
    );

    try {
      const response = await fetch("/api/run-h-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          objective,
          testerCount,
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
          `Launched ${payload.meta.launchedCount ?? payload.data.sessions.length}/${payload.meta.requestedCount ?? testerCount} H Company sessions for ${payload.data.analysis?.productName ?? "target product"}.`,
        );
      } else {
        setStatusLine(
          `Run started for ${payload.data.analysis?.productName ?? "target product"}.`,
        );
      }
    } catch (error) {
      setSnapshot(beforeLaunch);
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
      setPersonasAccepted(false);

      setSnapshot((current) => {
        if (!current.analysis) return current;
        const generatedPersonas = current.analysis.personas.filter(
          (persona) => !isUserSuppliedPersona(persona),
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

  function handleAcceptPersonas() {
    if (!snapshot.analysis) return;
    setPersonasAccepted(true);
    setStatusLine(
      `${snapshot.analysis.personas.length} persona suggestions accepted and saved in this browser.`,
    );
    setPersistenceLine("Accepted persona roster saved for this lab run.");
  }

  function handleNewTest() {
    clearPersistedLabState(window.localStorage);
    window.history.replaceState(window.history.state, "", window.location.pathname);
    pendingResultIds.current.clear();
    lastReportKey.current = null;
    liveEventCursors.current.clear();
    spokenLiveEventIds.current.clear();
    screenNarratedEventIds.current.clear();
    lastScreenNarrationAt.current = 0;
    replaySpokenEventIds.current.clear();
    liveVoiceAudioCacheRef.current.clear();
    liveVoiceEnabledRef.current = false;
    setLiveVoiceEnabled(false);
    stopLiveVoicePlayback("Enable live voice to hear screen action narration.");
    setSnapshot(createInitialRun());
    setTargetUrl("");
    setObjective(DEFAULT_OBJECTIVE);
    setSelectedPresetId(null);
    setTesterCount(4);
    setAuthorized(false);
    setPersonasAccepted(false);
    setLoading(false);
    setDispatching(false);
    setLiveEvents([]);
    setReplayFrameIndex(null);
    setReplayPlaying(false);
    setLocalizedHotspots(null);
    setHeatmapLine("Heatmap will appear after friction evidence is captured.");
    setDrawerOpen(false);
    setFixRequestIds(new Set());
    setHasRestoredSavedRun(false);
    setStatusLine("Enter a website and use case to start a new usability test.");
    setPersistenceLine("Previous run cleared. New test is not saved yet.");
  }

  async function handleVoice() {
    if (!selectedPersona || voiceLoading) return;
    if (liveViewport?.imageUrl) {
      await playScreenNarrationVoice(liveViewport);
      return;
    }
    await playPersonaVoice(
      selectedPersona.id,
      selectedPersona.voiceSlot,
      selectedNarration,
    );
  }

  async function playScreenNarrationVoice(frame: ScreenNarrationEvent) {
    if (!selectedPersona || voiceLoading || !frame.imageUrl) return;

    setVoiceLoading(true);
    setVoiceLine("Preparing screen action narration...");

    try {
      const response = await fetch("/api/screen-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: frame.imageUrl,
          personaName: selectedPersona.displayName,
          personaDescription: `${selectedPersona.tagline}. ${selectedPersona.context}. ${selectedPersona.behaviors.join(" ")}`,
          objective: snapshot.objective ?? objective,
          currentUrl: frame.currentUrl ?? snapshot.url,
        }),
      });
      const payload = (await response.json()) as ScreenNarrationPayload;
      if (!response.ok || !payload.data?.text) {
        throw new Error(payload.error?.message ?? "Screen narration failed.");
      }

      const voiceItem = await synthesizeVoiceItem({
        eventId: `manual-screen-narration:${frame.id}:${Date.now()}`,
        personaId: selectedPersona.id,
        voiceSlot: selectedPersona.voiceSlot,
        text: payload.data.text,
      });
      if (!voiceItem) throw new Error("Voice generation failed.");

      if (voiceItem.audioSrc) {
        await new Audio(voiceItem.audioSrc).play();
        setVoiceLine("Screen action narration played.");
      } else {
        speakWithBrowser(voiceItem.transcript);
        setVoiceLine("Browser voice narrated the screen action.");
      }
    } catch (error) {
      setVoiceLine(
        error instanceof Error
          ? `${error.message} Try enabling live voice and replaying.`
          : "Could not narrate this screen.",
      );
    } finally {
      setVoiceLoading(false);
    }
  }

  async function playPersonaVoice(
    personaId: string,
    voiceSlot: 0 | 1 | 2 | 3,
    text: string,
  ) {
    if (voiceLoading) return;

    setVoiceLoading(true);
    setVoiceLine("Preparing persona voice...");

    try {
      const response = await fetch("/api/voice-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          voiceSlot,
          text,
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
        setVoiceLine("Gradium fallback: browser voice spoke the selected line.");
      }
    } catch (error) {
      speakWithBrowser(text);
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

  async function handleSpawnFixAgent() {
    if (!selectedFriction || !selectedPersona || !selectedSession) return;
    const requestId = `${selectedSession.sessionId}:final:${selectedFriction.step}`;
    setStatusLine(`Spawning proposal agents for ${selectedPersona.displayName}.`);
    const response = await fetch("/api/report?fixJob=1", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ runId:snapshot.id, sessionId:selectedSession.sessionId, personaId:selectedPersona.id, personaName:selectedPersona.displayName, productUrl:snapshot.url, objective:snapshot.objective ?? objective, frustrationEventId:requestId, frustration:selectedFriction }) });
    if (response.ok) { setFixRequestIds((current) => new Set(current).add(requestId)); setStatusLine(`Fix proposal job queued for ${selectedPersona.displayName}.`); }
    else setStatusLine("Could not start the fix proposal job.");
  }

  async function handleQueueCalibratedRegression() {
    if (!activeCalibration || !runComplete) return;
    setRegressionLine("Queueing a proposal-only NemoClaw regression job...");
    try {
      const response = await fetch(
        `/api/calibrations/${encodeURIComponent(activeCalibration.id)}/regression`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateRunId: snapshot.id }),
        },
      );
      if (!response.ok) throw new Error("Regression job was not accepted.");
      setRegressionLine(
        "Guarded regression queued: allowed host only, read-only investigation, proposal-only output.",
      );
    } catch (error) {
      setRegressionLine(
        error instanceof Error ? error.message : "Could not queue the regression job.",
      );
    }
  }

  if (false) {
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
            <fieldset className="rounded-lg border border-ink/12 bg-white/70 p-4">
              <legend className="px-1 text-sm font-bold">Grandmas to spawn</legend>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {TESTER_COUNT_OPTIONS.map((count) => (
                  <button
                    aria-pressed={testerCount === count}
                    className={`min-h-11 rounded-md border px-3 text-sm font-black transition ${
                      testerCount === count
                        ? "border-mint bg-mint text-ink shadow-[0_10px_24px_rgba(98,196,155,0.22)]"
                        : "border-ink/14 bg-white text-ink/68 hover:border-mint/50"
                    }`}
                    key={count}
                    onClick={() => {
                      setTesterCount(count);
                      setStatusLine(
                        `${count} grandma${count === 1 ? "" : "s"} selected for the next H Company dispatch.`,
                      );
                    }}
                    type="button"
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                Generates 4 personas; launches {testerCount} generated session{testerCount === 1 ? "" : "s"}
                {customPersonaCount > 0 ? " plus your custom persona." : "."}
              </p>
            </fieldset>
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
            {panelReviewItems.length > 0 ? (
              <section className="rounded-lg border border-ink/12 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/45">
                      Generated panel
                    </p>
                    <h3 className="mt-1 text-xl font-black">Review personas before dispatch</h3>
                  </div>
                  <span className="rounded-full bg-ink/6 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-ink/55">
                    {testerCount} launching
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {panelReviewItems.map((item) => (
                    <button
                      className={`rounded-md border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        item.selected
                          ? "border-mint bg-mint/10 ring-2 ring-mint/45"
                          : "border-ink/10 bg-white"
                      }`}
                      key={item.id}
                      onClick={() => {
                        setSnapshot((current) => ({
                          ...current,
                          selectedPersonaId: item.id,
                        }));
                        setDrawerOpen(true);
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{item.displayName}</p>
                          <p className="mt-1 text-sm font-semibold text-brass">{item.tagline}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                            item.launchState === "launching"
                              ? "bg-mint text-ink"
                              : "bg-ink/8 text-ink/55"
                          }`}
                        >
                          {item.launchState}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/68">
                        {item.context}
                      </p>
                      <div className="mt-3 rounded border border-ink/8 bg-paper/70 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">
                          Task
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/72">
                          {item.task}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-ink/12 bg-white p-4">
              <div>
                <p className="font-black">
                  {personasAccepted ? "Persona roster accepted" : "Approve these suggestions"}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  Acceptance saves the generated roster with this lab run.
                </p>
              </div>
              <button
                className="rounded-md border border-mint bg-mint px-4 py-2 font-black text-ink disabled:opacity-60"
                disabled={personasAccepted || !snapshot.analysis}
                onClick={handleAcceptPersonas}
                type="button"
              >
                {personasAccepted ? "Accepted and saved" : "Accept and save"}
              </button>
            </div>
            <button
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-5 font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                panelFeedback.tone === "ready"
                  ? "border-mint bg-mint text-ink shadow-[0_12px_28px_rgba(98,196,155,0.22)] hover:-translate-y-0.5"
                  : "border-ink/18 bg-white text-ink"
              }`}
              disabled={!canDispatch}
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
                  {selectedTesterCount} selected tester{selectedTesterCount === 1 ? "" : "s"}, one product
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
            {selectedPersona?.displayName ?? selectedSession?.personaId ?? "persona"} says:
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
              {voiceLoading ? "Voicing..." : liveViewport?.imageUrl ? "Narrate Screen" : "Speak Finding"}
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
              {(selectedSession?.finding?.evidence?.length
                ? selectedSession?.finding?.evidence ?? []
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
              {(selectedSession?.finding?.frictionEvents?.length
                ? selectedSession?.finding?.frictionEvents ?? []
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
                href={selectedSession.agentViewUrl ?? undefined}
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

  const isLiveView = snapshot.sessions.length > 0 || snapshot.phase === "running" || snapshot.phase === "report";
  const isPersonaView = Boolean(snapshot.analysis) && !isLiveView;
  const selectedFixRequestId = selectedFriction && selectedSession
    ? liveFrustration?.id ?? `${selectedSession.sessionId}:final:${selectedFriction.step}`
    : null;
  const fixReady = selectedFixRequestId ? fixRequestIds.has(selectedFixRequestId) : false;
  const replayMode = selectedSession?.sessionId.startsWith("demo-") ?? false;
  return (
    <div className="simple-app">
      <header className="simple-header">
        <a className="simple-brand" href="#setup" aria-label="GrannySmith home">
          <span>GS</span>
          GrannySmith
        </a>
        <div className="simple-header-actions">
        <div className="simple-header-status">
          <span className={liveMode && !runComplete ? "is-live" : ""} />
          {dispatching ? "Connecting H agents" : runComplete ? "Run complete" : liveMode ? "H agents live" : snapshot.analysis ? "Ready to dispatch" : "New test"}
        </div>
        {isLiveView ? (
          <button
            onClick={handleNewTest}
            type="button"
          >
            New test
          </button>
        ) : null}
        </div>
      </header>

      <main className="simple-shell">
        {!snapshot.analysis && !isLiveView ? (
        <section className="launch-scene" id="setup">
          <div className="simple-intro">
            <p className="simple-kicker">Synthetic user testing</p>
            <h1>Who can use what you built?</h1>
            <p>Enter a product and one thing a user should accomplish.</p>
          </div>

          <form className="simple-form" onSubmit={handlePlan}>
            <div className="url-row">
              <label htmlFor="target-url">Product URL</label>
              <div>
                <input
                  id="target-url"
                  onChange={(event) => setTargetUrl(event.target.value)}
                  type="url"
                  value={targetUrl}
                />
              </div>
            </div>

            <label className="use-case-field" htmlFor="objective">
              Use case
              <textarea
                id="objective"
                onChange={(event) => {
                  setObjective(event.target.value);
                  setSelectedPresetId(null);
                }}
                value={objective}
              />
            </label>

            <div className="preset-row" aria-label="Example test presets">
              <span>Try an example</span>
              {DEMO_PRESETS.map((preset) => (
                <button
                  aria-pressed={selectedPresetId === preset.id}
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    setTargetUrl(preset.url);
                    setObjective(preset.objective);
                  }}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <label className="permission-row">
              <input
                checked={authorized}
                onChange={(event) => setAuthorized(event.target.checked)}
                type="checkbox"
              />
              I own this site or have permission to test it.
            </label>
            <button className="analyze-button" disabled={loading || dispatching || !authorized} type="submit">
              <Sparkles size={16} /> {loading ? "Finding target users…" : "Suggest target users"}
            </button>
            <a className="mt-3 inline-flex items-center gap-2 text-sm font-black text-brass" href="/calibrate">
              <ShieldCheck size={15} /> Calibrate from a real human session
            </a>
          </form>
        </section>
        ) : null}

        {isPersonaView ? (
            <section className="persona-scene">
              <div className="simple-section-heading">
                <div>
                  <p>Suggested for {snapshot.analysis?.productName}</p>
                  <h1>Who should try it?</h1>
                </div>
              </div>

              {activeCalibration ? (
                <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  <b>{activeCalibration.testerName}&apos;s behavioral proxy is attached.</b>{" "}
                  It contains only the rules approved during human review and will run alongside the generated panel.
                </div>
              ) : null}

              <div className="persona-cards" role="group" aria-label="Suggested tester roster">
                {snapshot.analysis?.personas.map((persona, index) => (
                  <button
                    aria-label={`${persona.displayName}, ${index < testerCount || isUserSuppliedPersona(persona) ? "included" : "standby"}. Preview persona`}
                    aria-pressed={snapshot.selectedPersonaId === persona.id}
                    className={snapshot.selectedPersonaId === persona.id ? "is-selected" : ""}
                    key={persona.id}
                    onClick={() => setSnapshot((current) => ({ ...current, selectedPersonaId: persona.id }))}
                    type="button"
                  >
                    <span className={`persona-swatch swatch-${persona.visualVariant}`}>
                      {persona.displayName.charAt(0)}
                    </span>
                    <span>
                      <b>{persona.displayName}</b>
                      <small>{persona.tagline} · {persona.digitalConfidence} confidence</small>
                    </span>
                    <em>{index < testerCount || isUserSuppliedPersona(persona) ? <><Check size={13} /> Included</> : "Standby"}</em>
                  </button>
                ))}
              </div>

              <PersonaBuilder
                disabled={loading || dispatching || liveMode || Boolean(activeCalibration)}
                onCreate={handleCreatePersona}
              />

              <div className={`persona-approval ${personasAccepted ? "is-accepted" : ""}`}>
                <div>
                  <b>{personasAccepted ? "Persona roster accepted" : "Do these personas look right?"}</b>
                  <span>
                    {personasAccepted
                      ? "Saved with this lab run. You can safely reload before dispatching."
                      : "Review the suggested users, then accept and save the roster before dispatch."}
                  </span>
                </div>
                <button
                  disabled={personasAccepted || !snapshot.analysis}
                  onClick={handleAcceptPersonas}
                  type="button"
                >
                  {personasAccepted ? <><Check size={14} /> Accepted and saved</> : "Accept and save personas"}
                </button>
              </div>

              <div className="dispatch-row">
                <div>
                  <span>Testers</span>
                  <div className="count-picker">
                    {TESTER_COUNT_OPTIONS.map((count) => (
                      <button
                        aria-label={`Run ${count} testers`}
                        aria-pressed={testerCount === count}
                        key={count}
                        onClick={() => setTesterCount(count)}
                        type="button"
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="dispatch-button"
                  disabled={!canDispatch}
                  onClick={handleLaunch}
                  type="button"
                >
                  <Play size={17} />
                  {dispatching ? "Dispatching…" : !personasAccepted ? "Accept personas first" : `Dispatch ${selectedTesterCount} testers`}
                </button>
              </div>
              <button className="quiet-back" onClick={handleNewTest} type="button">← Change website</button>
            </section>
          ) : null}

        {isLiveView && snapshot.analysis ? (
          <section className="live-room" aria-labelledby="live-room-title">
            <div className="live-room-heading">
              <div>
                <p><Activity size={14} /> {dispatching ? `${launchingSessionsLabel(snapshot.sessions.length)} connecting` : activeSessions.length ? `${activeSessions.length} agents active` : "Run complete"}</p>
                <h1 id="live-room-title">Watching {selectedPersona?.displayName}</h1>
              </div>
              <div className="live-provider-controls">
                <div className="provider-badges">
                  <span><i className={runComplete ? "done" : "connected"} />H Company · {dispatching ? "connecting" : replayMode ? "replay" : runComplete ? "complete" : "status connected"}</span>
                  <span>Gradium · {liveViewport?.imageUrl ? "screen action voice" : hasLiveNarration ? "live event voice" : "finding voice"}</span>
                  <button
                    aria-pressed={liveVoiceEnabled}
                    className="live-voice-toggle"
                    onClick={handleLiveVoiceToggle}
                    type="button"
                  >
                    <Volume2 size={12} /> {liveVoiceEnabled ? "Live voice on" : "Enable live voice"}
                  </button>
                </div>
                <small aria-live="polite" className="live-voice-line">{liveVoiceLine}</small>
              </div>
            </div>

            <div className="live-persona-dock" role="group" aria-label="Switch observed tester">
              {dispatchedPersonas.map((persona) => {
                const session = sessionsByPersona.get(persona.id);
                return (
                  <button
                    aria-label={`Observe ${persona.displayName}: ${session?.latestActionLabel ?? "queued"}`}
                    aria-pressed={snapshot.selectedPersonaId === persona.id}
                    className={snapshot.selectedPersonaId === persona.id ? "is-active" : ""}
                    key={persona.id}
                    onClick={() => setSnapshot((current) => ({ ...current, selectedPersonaId: persona.id }))}
                    type="button"
                  >
                    <span className={`persona-swatch swatch-${persona.visualVariant}`}>{persona.displayName.charAt(0)}</span>
                    <b>{persona.displayName}</b>
                    <i className={`state-${session?.visualState ?? "queued"}`} />
                  </button>
                );
              })}
            </div>

            {activeCalibration ? (
              <section className="mb-5 grid gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em]">Human calibration overlap</p>
                  <p className="mt-2 text-2xl font-black">
                    {behaviorOverlap?.score === null || behaviorOverlap?.score === undefined
                      ? "Waiting for calibrated evidence"
                      : `${behaviorOverlap.score}% observable overlap`}
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {behaviorOverlap?.totalObserved
                      ? `${behaviorOverlap.reproducedCount}/${behaviorOverlap.totalObserved} observed friction types reproduced. This measures evidence overlap, not personal similarity.`
                      : "The calibrated H session must finish before overlap can be measured."}
                  </p>
                  <small className="mt-2 block font-semibold">{regressionLine}</small>
                </div>
                <button
                  className="rounded-xl bg-[#172018] px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                  disabled={!runComplete || !calibratedRunSession?.finding}
                  onClick={handleQueueCalibratedRegression}
                  type="button"
                >
                  <Bot className="mr-2 inline" size={15} /> Queue guarded regression
                </button>
              </section>
            ) : null}

            <div className="live-layout">
              <div className="agent-stage">
                <div className="browser-bar">
                  <i /><i /><i />
                  <span>{liveViewport?.currentUrl ?? snapshot.url}</span>
                  <b>{selectedSession?.status ?? "queued"}</b>
                </div>
                <div className="browser-screen">
                  <span className="frame-mode">
                    {liveViewport
                      ? runComplete
                        ? `Evidence replay · frame ${activeViewportFrameIndex + 1} of ${viewportFrames.length}`
                        : `Exact H viewport · ${viewportFrames.length} frame${viewportFrames.length === 1 ? "" : "s"}`
                      : replayMode
                        ? "Evidence replay"
                        : runComplete
                          ? "No H viewport frames received"
                          : "Waiting for H viewport"}
                  </span>
                  {selectedHotspots.length > 0 ? (
                    <span className="live-heatmap-status">
                      <Activity size={11} /> {replayFrameIndex !== null ? "Frame attention" : liveMode ? "Live heatmap" : "Evidence heatmap"} · {selectedHotspots.length} signal{selectedHotspots.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {liveViewport?.imageUrl ? (
                    <Image
                      alt={`Live H Company browser for ${selectedPersona?.displayName ?? "agent"}`}
                      className="agent-live-viewport"
                      height={900}
                      src={liveViewport.imageUrl}
                      unoptimized
                      width={1280}
                    />
                  ) : liveViewportPresentation.showSyntheticScaffold ? (
                    <>
                      <div className="screen-nav"><span /><span /><span /></div>
                      <div className="screen-copy">
                        <i />
                        <i />
                        <i />
                        <button type="button">Primary action</button>
                      </div>
                    </>
                  ) : null}
                  {liveViewportPresentation.showHotspotOverlay ? (
                    <div className="agent-viewport-coordinate-space is-heatmap">
                      <HotspotLayer
                        hotspots={selectedHotspots}
                        onSelect={handleHotspotSelect}
                      />
                      <HeatmapDensityLayer hotspots={replayFrameIndex !== null ? selectedHotspots : []} />
                    </div>
                  ) : null}
                  {agentCursorPoint ? (
                    <div className="agent-viewport-coordinate-space">
                      <div
                        aria-label={`${selectedPersona?.displayName ?? "Agent"} cursor, ${agentCursorPoint.source === "agent" ? "reported by H" : agentCursorPoint.source === "vision" ? "localized from the screenshot" : "estimated for legacy replay"}`}
                        className={`agent-cursor ${agentCursorPoint.source === "agent" ? "is-reported" : agentCursorPoint.source === "vision" ? "is-vision" : "is-estimated"}`}
                        data-cursor-source={agentCursorPoint.source}
                        style={{
                          left: `${agentCursorPoint.x}%`,
                          top: `${agentCursorPoint.y}%`,
                        }}
                      >
                        <i aria-hidden="true" />
                        <MousePointer2 aria-hidden="true" size={30} />
                        <span>
                          {selectedPersona?.displayName ?? "Agent"} cursor · {agentCursorPoint.source === "agent" ? "H reported" : agentCursorPoint.source === "vision" ? "vision located" : "estimated"}
                        </span>
                      </div>
                    </div>
                  ) : liveViewportPresentation.showSyntheticScaffold ? (
                    <div className="agent-cursor is-placeholder" style={{ left: "62%", top: "62%" }}>
                      <MousePointer2 aria-hidden="true" size={30} />
                      <span>Waiting for agent</span>
                    </div>
                  ) : null}
                  <div className="thought-annotation">
                    <span><Volume2 size={12} /> {liveViewport?.imageUrl ? "Screen action narration" : hasLiveNarration ? "Live agent narration" : runComplete ? "Finding narration" : "Persona preview"}</span>
                    <blockquote>“{selectedNarration}”</blockquote>
                    <button disabled={voiceLoading || !selectedPersona} onClick={handleVoice} type="button">
                      {voiceLoading ? "Preparing..." : liveViewport?.imageUrl ? "Narrate this screen" : hasLiveNarration ? "Hear live reaction" : runComplete ? "Hear finding" : "Hear persona preview"}
                    </button>
                  </div>
                  {selectedFriction ? (
                    <div className="frustration-annotation">
                      <span><AlertTriangle size={12} /> Frustration · {selectedFriction.severity}/5</span>
                      <p>{selectedFriction.observation}</p>
                      {fixReady ? (
                        <small>
                          <Check size={12} /> Fix brief ready
                        </small>
                      ) : (
                        <button onClick={handleSpawnFixAgent} type="button"><Bot size={13} /> Propose fix</button>
                      )}
                    </div>
                  ) : null}
                </div>
                {viewportFrames.length > 0 ? (
                  <div className="replay-controls" aria-label="Computer-use run replay controls">
                    <button
                      aria-label="Previous captured frame"
                      disabled={activeViewportFrameIndex === 0}
                      onClick={() => {
                        setReplayPlaying(false);
                        stopLiveVoicePlayback("Replay paused. Live voice remains enabled.");
                        setReplayFrameIndex(Math.max(0, activeViewportFrameIndex - 1));
                      }}
                      type="button"
                    >
                      <SkipBack size={14} />
                    </button>
                    <button
                      aria-label={replayPlaying ? "Pause run replay" : "Play run replay"}
                      disabled={viewportFrames.length < 2}
                      onClick={handleReplayToggle}
                      type="button"
                    >
                      {replayPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {replayPlaying ? "Pause" : runComplete ? "Replay run" : "Review frames"}
                    </button>
                    <div className="replay-progress" aria-hidden="true">
                      <i style={{ width: `${((activeViewportFrameIndex + 1) / viewportFrames.length) * 100}%` }} />
                    </div>
                    <span>{activeViewportFrameIndex + 1} / {viewportFrames.length}</span>
                    <button
                      aria-label="Next captured frame"
                      disabled={activeViewportFrameIndex >= viewportFrames.length - 1}
                      onClick={() => {
                        setReplayPlaying(false);
                        stopLiveVoicePlayback("Replay paused. Live voice remains enabled.");
                        setReplayFrameIndex(Math.min(viewportFrames.length - 1, activeViewportFrameIndex + 1));
                      }}
                      type="button"
                    >
                      <SkipForward size={14} />
                    </button>
                  </div>
                ) : null}
                <div className="agent-action-bar">
                  <span className="agent-avatar">{selectedPersona?.displayName.charAt(0) ?? "?"}</span>
                  <div>
                    <small>{runComplete ? "Evidence captured" : "H API status"} · {selectedSession?.stepCount ?? 0} steps</small>
                    <b>{selectedSession?.latestActionLabel ?? "Waiting to start"}</b>
                    {!replayMode ? (
                      <span className="live-feed-note">
                        {liveViewport
                          ? runComplete
                            ? "Captured computer-use evidence is available above. Replay the run or select a heatmap marker."
                            : "Rendering exact H browser frames as observation events arrive."
                          : runComplete
                            ? "H did not include browser frames in the event feed. Open Agent View to inspect the provider recording."
                            : "Waiting for the first H browser frame. Agent View remains available while the agent is queued."}
                      </span>
                    ) : null}
                  </div>
                  {selectedSession?.agentViewUrl ? (
                    <a href={selectedSession.agentViewUrl} rel="noreferrer" target="_blank">
                      Open Agent View <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
              </div>

              </div>
          </section>
        ) : null}

        {isLiveView && report ? (
          <details className="findings-disclosure" id="results">
            <summary><span>{report.score}</span><b>View findings</b><small>{visualHotspots.length} friction signals</small></summary>
          <section className="result-strip">
            <div><small>Human-friendly score</small><b>{report.score}<span>/100</span></b></div>
            <div><small>Frustration hotspots</small><b>{visualHotspots.length}</b></div>
            <div className="result-recommendation"><small>Highest-impact fix</small><b>{report.topRecommendations[0]}</b></div>
            <div className="export-actions">
              <button onClick={handleCopySummary} type="button"><Clipboard size={15} /> Copy</button>
              <button onClick={() => handleDownloadReport("markdown")} type="button"><Download size={15} /> Report</button>
            </div>
          </section>
          </details>
        ) : null}

        {!isLiveView || dispatching ? <p className="simple-status" aria-live="polite">{statusLine}</p> : null}
      </main>

      {!isLiveView ? <footer className="simple-footer">
        <ShieldCheck size={14} /> Only test products you own or have permission to evaluate.
      </footer> : null}

      {drawerOpen ? (
        <div className="simple-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="simple-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)} type="button">Close</button>
            <p className="simple-kicker">Evidence</p>
            <h2>{selectedPersona?.displayName}’s test</h2>
            <div className="drawer-metrics">
              <MetricTile label="Status" value={selectedSession?.status ?? "queued"} />
              <MetricTile label="Actions" value={String(selectedSession?.stepCount ?? 0)} />
            </div>
            <h3>Task</h3>
            <p>{selectedPersona?.task}</p>
            <h3>What happened</h3>
            <p>{selectedSession?.finding?.summary ?? selectedSession?.latestActionLabel ?? "Waiting for evidence."}</p>
            {selectedFriction ? (
              <div className="drawer-fix">
                <b>Suggested fix</b>
                <p>{selectedFriction.recommendation}</p>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
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
    <>
      <HeatmapDensityLayer hotspots={hotspots} />
      <div className="absolute inset-0 z-20 pointer-events-none">
        {hotspots.slice(-6).map((hotspot) => (
        <button
          aria-label={`${hotspot.category} hotspot: ${hotspot.evidence}`}
          className={`pointer-events-auto absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-sm font-black text-white shadow-2xl transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white ${hotspotClass(
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
          <span
            aria-hidden="true"
            className="absolute -inset-6 rounded-full opacity-35 blur-xl"
            style={{ backgroundColor: hotspotGlowColor(hotspot.severity) }}
          />
          <span className="absolute -inset-2 animate-ping rounded-full bg-white/35" />
          <span className="absolute -inset-1 rounded-full border border-white/45" />
          <span className="relative">{hotspot.severity}</span>
        </button>
      ))}
      </div>
    </>
  );
}

function HeatmapDensityLayer({ hotspots }: { hotspots: VisualHotspot[] }) {
  const densityBlobs = buildHeatmapDensityBlobs(hotspots);
  if (densityBlobs.length === 0) return null;

  return (
    <div aria-hidden="true" className="heatmap-density-layer">
      {densityBlobs.map((blob) => (
        <i
          className="heatmap-density-blob"
          key={blob.id}
          style={{
            "--heatmap-core-opacity": blob.coreOpacity,
            height: `${blob.radius * 2}%`,
            left: `${blob.x}%`,
            opacity: blob.opacity,
            top: `${blob.y}%`,
            width: `${blob.radius * 2}%`,
          } as CSSProperties}
        />
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

function launchingSessionsLabel(count: number): string {
  return `${count} agent${count === 1 ? "" : "s"}`;
}

function createInitialRun(): RunSnapshot {
  const demo = createDemoRun();
  return {
    ...demo,
    id: "new-run",
    phase: "idle",
    analysis: null,
    sessions: [],
    selectedPersonaId: null,
    report: null,
    error: null,
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

function hotspotGlowColor(severity: number): string {
  if (severity >= 4) return "rgba(229, 88, 72, .82)";
  if (severity === 3) return "rgba(191, 131, 45, .76)";
  return "rgba(98, 196, 155, .72)";
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
