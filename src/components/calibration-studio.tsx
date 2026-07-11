"use client";

import {
  ArrowRight,
  Check,
  CircleStop,
  Mic,
  MonitorUp,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { CalibrationSession } from "@/lib/calibration/calibration";

type ApiPayload = {
  data?: CalibrationSession;
  meta?: { fallbackReason?: string | null };
  error?: { message?: string };
};

const MAX_CAPTURED_FRAMES = 8;

export function CalibrationStudio() {
  const [testerName, setTesterName] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://demo.vercel.store");
  const [objective, setObjective] = useState(
    "Find a product and reach checkout review without placing an order.",
  );
  const [observationNotes, setObservationNotes] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [researchUseConfirmed, setResearchUseConfirmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [session, setSession] = useState<CalibrationSession | null>(null);
  const [behaviorRules, setBehaviorRules] = useState<string[]>([]);
  const [trustBoundaries, setTrustBoundaries] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState(
    "Record a consented screen-and-voice usability session, or upload one.",
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const frameTimerRef = useRef<number | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const canRecord = consentConfirmed && researchUseConfirmed;
  const approved = session?.status === "approved";

  async function startRecording() {
    if (!canRecord || !navigator.mediaDevices?.getDisplayMedia) return;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 12 },
        audio: false,
      });
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamsRef.current = [display, microphone];
      const combined = new MediaStream([
        ...display.getVideoTracks(),
        ...microphone.getAudioTracks(),
      ]);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(combined, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      setFrames([]);
      setRecordingFile(null);
      if (previewRef.current) {
        previewRef.current.srcObject = display;
        await previewRef.current.play().catch(() => undefined);
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (blob.size > 0) {
          setRecordingFile(
            new File([blob], `calibration-${Date.now()}.webm`, {
              type: "video/webm",
            }),
          );
          setStatusLine("Recording ready. Add researcher notes, then analyze.");
        }
      };
      display.getVideoTracks()[0]?.addEventListener("ended", stopRecording, {
        once: true,
      });
      recorder.start(1000);
      frameTimerRef.current = window.setInterval(captureFrame, 2000);
      setRecording(true);
      setStatusLine("Recording screen and microphone. Stop before private data appears.");
    } catch {
      stopTracks();
      setStatusLine("Screen or microphone permission was not granted.");
    }
  }

  function captureFrame() {
    const video = previewRef.current;
    if (!video || video.videoWidth === 0) return;
    setFrames((current) => {
      if (current.length >= MAX_CAPTURED_FRAMES) return current;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 960 / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return [...current, canvas.toDataURL("image/jpeg", 0.72)];
    });
  }

  function stopRecording() {
    captureFrame();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopTracks();
    setRecording(false);
  }

  function stopTracks() {
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    streamsRef.current.forEach((stream) =>
      stream.getTracks().forEach((track) => track.stop()),
    );
    streamsRef.current = [];
    if (previewRef.current) previewRef.current.srcObject = null;
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["video/webm", "video/mp4"].includes(file.type) || file.size > 25 * 1024 * 1024) {
      setRecordingFile(null);
      setStatusLine("Use a WebM or MP4 recording no larger than 25 MB.");
      return;
    }
    setRecordingFile(file);
    setStatusLine("Uploaded recording ready for analysis.");
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recordingFile || !canRecord) return;
    setBusy(true);
    setStatusLine("Extracting observable usability evidence with NVIDIA...");
    try {
      const form = new FormData();
      form.set("testerName", testerName);
      form.set("targetUrl", targetUrl);
      form.set("objective", objective);
      form.set("observationNotes", observationNotes);
      form.set("consentConfirmed", String(consentConfirmed));
      form.set("researchUseConfirmed", String(researchUseConfirmed));
      form.set("video", recordingFile);
      form.set("frames", JSON.stringify(frames));
      const response = await fetch("/api/calibrations", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Calibration analysis failed.");
      }
      setSession(payload.data);
      setBehaviorRules(payload.data.behaviorRules);
      setTrustBoundaries(payload.data.trustBoundaries);
      setStatusLine(
        payload.meta?.fallbackReason ??
          "Analysis complete. A human must review every rule before dispatch.",
      );
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Calibration analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function review(approvedValue: boolean) {
    if (!session) return;
    setBusy(true);
    setStatusLine(approvedValue ? "Saving human approval..." : "Rejecting this profile...");
    try {
      const response = await fetch(`/api/calibrations/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: approvedValue,
          behaviorRules,
          trustBoundaries,
        }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not save the review.");
      }
      setSession(payload.data);
      setStatusLine(
        approvedValue
          ? "Behavioral proxy approved. It can now join the GrannySmith panel."
          : "Profile rejected. It will never be dispatched.",
      );
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <section className="rounded-[2rem] border border-black/10 bg-[#172018] p-7 text-[#f5f1e6] shadow-2xl lg:sticky lg:top-6 lg:self-start">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#d9a85a]">
          <Sparkles size={14} /> Human calibration
        </p>
        <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
          One human session.<br />A usability signal that lasts.
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-white/70">
          GrannySmith learns only approved, observable interaction patterns. It does not clone a voice, identity, diagnosis, or private trait.
        </p>
        <div className="mt-8 grid gap-3 text-sm">
          <p className="flex gap-3 rounded-xl bg-white/7 p-4"><MonitorUp className="shrink-0 text-[#d9a85a]" size={19} /> Screen evidence captures where friction occurred.</p>
          <p className="flex gap-3 rounded-xl bg-white/7 p-4"><Mic className="shrink-0 text-[#d9a85a]" size={19} /> Think-aloud audio can be transcribed by configured NVIDIA VSS.</p>
          <p className="flex gap-3 rounded-xl bg-white/7 p-4"><ShieldCheck className="shrink-0 text-[#d9a85a]" size={19} /> Human approval is mandatory before any agent runs.</p>
        </div>
        <video className="mt-6 aspect-video w-full rounded-xl bg-black/30 object-cover" muted playsInline ref={previewRef} />
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8">
        {!session ? (
          <form className="grid gap-5" onSubmit={analyze}>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Calibration session</p>
              <h2 className="mt-2 text-3xl font-black">Record the real journey</h2>
            </div>
            <label className="grid gap-2 text-sm font-bold">
              Tester name
              <input className="rounded-xl border border-black/15 bg-white px-4 py-3" maxLength={60} onChange={(event) => setTesterName(event.target.value)} required value={testerName} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Product URL
              <input className="rounded-xl border border-black/15 bg-white px-4 py-3" onChange={(event) => setTargetUrl(event.target.value)} required type="url" value={targetUrl} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Test objective
              <textarea className="min-h-24 rounded-xl border border-black/15 bg-white px-4 py-3" maxLength={500} onChange={(event) => setObjective(event.target.value)} required value={objective} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Researcher notes
              <textarea className="min-h-28 rounded-xl border border-black/15 bg-white px-4 py-3" maxLength={4000} minLength={12} onChange={(event) => setObservationNotes(event.target.value)} placeholder="What did the tester hesitate over, retry, distrust, or recover from?" required value={observationNotes} />
            </label>
            <div className="grid gap-3 rounded-xl border border-[#d9a85a]/40 bg-[#fff7e7] p-4 text-sm">
              <label className="flex items-start gap-3 font-semibold"><input checked={consentConfirmed} className="mt-1" onChange={(event) => setConsentConfirmed(event.target.checked)} type="checkbox" /> The tester consented to screen and microphone recording.</label>
              <label className="flex items-start gap-3 font-semibold"><input checked={researchUseConfirmed} className="mt-1" onChange={(event) => setResearchUseConfirmed(event.target.checked)} type="checkbox" /> The tester approved behavioral research use for this product.</label>
            </div>
            <div className="flex flex-wrap gap-3">
              {!recording ? (
                <button className="inline-flex items-center gap-2 rounded-xl bg-[#172018] px-5 py-3 font-black text-white disabled:opacity-40" disabled={!canRecord} onClick={startRecording} type="button"><Play size={17} /> Start recording</button>
              ) : (
                <button className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white" onClick={stopRecording} type="button"><CircleStop size={17} /> Stop recording</button>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 px-5 py-3 font-black">
                <Upload size={17} /> Upload recording
                <input accept="video/webm,video/mp4" aria-label="Upload recording" className="sr-only" onChange={handleUpload} type="file" />
              </label>
            </div>
            {recordingFile ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><Check className="mr-2 inline" size={15} />{recordingFile.name} · {(recordingFile.size / 1024 / 1024).toFixed(1)} MB</p> : null}
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d9a85a] px-5 py-4 font-black text-[#172018] disabled:opacity-40" disabled={busy || !recordingFile || !canRecord} type="submit"><Sparkles size={17} /> {busy ? "Analyzing…" : "Analyze session"}</button>
          </form>
        ) : (
          <div className="grid gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Human review gate</p>
              <h2 className="mt-2 text-3xl font-black">Review the behavioral proxy</h2>
              <p className="mt-3 leading-7 text-black/60">Delete or rewrite anything that is not directly supported by the recording. Approval is required before dispatch.</p>
            </div>
            <ReviewList label="Approved behavior rules" onChange={setBehaviorRules} values={behaviorRules} />
            <ReviewList label="Trust and stop boundaries" onChange={setTrustBoundaries} values={trustBoundaries} />
            {!approved && session.status !== "rejected" ? (
              <div className="flex flex-wrap gap-3">
                <button className="rounded-xl bg-[#172018] px-5 py-3 font-black text-white" disabled={busy} onClick={() => review(true)} type="button"><Check className="mr-2 inline" size={16} />Approve behavioral proxy</button>
                <button className="rounded-xl border border-red-300 px-5 py-3 font-black text-red-700" disabled={busy} onClick={() => review(false)} type="button">Reject profile</button>
              </div>
            ) : null}
            {approved ? (
              <a className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d9a85a] px-5 py-4 font-black text-[#172018]" href={`/lab?url=${encodeURIComponent(session.targetUrl)}&calibration=${encodeURIComponent(session.id)}`}>Open in GrannySmith Lab <ArrowRight size={17} /></a>
            ) : null}
          </div>
        )}
        <p aria-live="polite" className="mt-6 border-t border-black/10 pt-4 text-sm font-semibold text-black/55">{statusLine}</p>
      </section>
    </div>
  );
}

function ReviewList({ label, onChange, values }: { label: string; onChange: (values: string[]) => void; values: string[] }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-black uppercase tracking-[0.12em] text-black/45">{label}</legend>
      {values.map((value, index) => (
        <textarea className="min-h-20 rounded-xl border border-black/15 bg-white p-3 text-sm leading-6" key={`${label}-${index}`} maxLength={500} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} value={value} />
      ))}
    </fieldset>
  );
}
