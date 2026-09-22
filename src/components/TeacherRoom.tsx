"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSpeechCaptions } from "@/hooks/useSpeechCaptions";
import { CaptionText } from "@/components/CaptionText";

async function postCaption(
  code: string,
  payload: Record<string, unknown>,
) {
  await fetch(`/api/rooms/${code}/captions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function TeacherRoom({ code }: { code: string }) {
  const [enabled, setEnabled] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [finals, setFinals] = useState<string[]>([]);
  const [copied, setCopied] = useState<"student" | "teacher" | null>(null);

  const studentUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/room/${code}/student`;

  useEffect(() => {
    void postCaption(code, { type: "teacher", connected: true });
    return () => {
      void postCaption(code, { type: "teacher", connected: false });
    };
  }, [code]);

  const onLive = useCallback(
    (text: string) => {
      setLiveText(text);
      void postCaption(code, { type: "live", text });
    },
    [code],
  );

  const onFinal = useCallback(
    (text: string) => {
      setFinals((prev) => [...prev.slice(-40), text]);
      setLiveText("");
      void postCaption(code, { type: "final", text });
    },
    [code],
  );

  const { supported, listening, error } = useSpeechCaptions({
    enabled,
    onLive,
    onFinal,
  });

  const teacherUrl = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.href),
    [],
  );

  async function copy(kind: "student" | "teacher", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }

  async function clearAll() {
    setFinals([]);
    setLiveText("");
    await postCaption(code, { type: "clear" });
  }

  return (
    <div className="room-shell">
      <header className="room-header">
        <div>
          <p className="eyebrow">제일교회 AWANA · Teacher</p>
          <h1>Room {code}</h1>
        </div>
        <div className="status-pill" data-on={listening}>
          <span className="status-dot" />
          {listening ? "Listening" : "Paused"}
        </div>
      </header>

      <section className="link-row">
        <div>
          <p className="link-label">학생용 링크</p>
          <code>{studentUrl || "…"}</code>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => copy("student", studentUrl)}
        >
          {copied === "student" ? "Copied!" : "Copy student link"}
        </button>
      </section>

      <section className="teacher-controls">
        <button
          type="button"
          className={`mic-btn ${enabled ? "mic-btn--on" : ""}`}
          onClick={() => setEnabled((v) => !v)}
          disabled={!supported}
        >
          <span className="mic-pulse" aria-hidden />
          {enabled ? "Stop microphone" : "Start microphone"}
        </button>
        <button type="button" className="ghost-btn" onClick={clearAll}>
          Clear captions
        </button>
      </section>

      {!supported ? (
        <p className="error-text">
          Chrome 또는 Edge에서 열어 주세요. (Web Speech API 필요)
        </p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="caption-board">
        <div className="section-copy">
          <h2>Live captions</h2>
          <p>선생님이 영어로 말하면 자막이 학생 화면에 바로 전달됩니다.</p>
        </div>
        <div className="caption-scroll">
          {finals.map((line, index) => (
            <CaptionText key={`${line}-${index}`} text={line} />
          ))}
          {liveText ? <CaptionText text={liveText} live /> : null}
          {!finals.length && !liveText ? (
            <p className="muted">마이크를 켠 뒤 영어로 말해 보세요.</p>
          ) : null}
        </div>
      </section>

      <p className="fine-print">
        Teacher page: {teacherUrl || `/room/${code}/teacher`}
      </p>
    </div>
  );
}
